import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// One-time endpoint to create LinkedInAccounts for approved/onboarded applications
// that don't have a matching account yet. DELETE THIS FILE after use.
export async function POST() {
  try {
    await requireAdmin();

    const applications = await prisma.ambassadorApplication.findMany({
      where: { status: { in: ["approved", "onboarded"] } },
    });

    let created = 0;
    let skipped = 0;

    for (const app of applications) {
      // Check if a LinkedInAccount already exists for this URL
      const existing = await prisma.linkedInAccount.findFirst({
        where: { linkedinUrl: app.linkedinUrl },
      });

      if (existing) {
        // Update notes to include owner if missing
        if (existing.notes && !existing.notes.includes("Owner:")) {
          await prisma.linkedInAccount.update({
            where: { id: existing.id },
            data: { notes: `${existing.notes} Owner: ${app.email}.` },
          });
        } else if (!existing.notes) {
          await prisma.linkedInAccount.update({
            where: { id: existing.id },
            data: { notes: `Owner: ${app.email}. Profile email: ${app.linkedinEmail || app.email}.` },
          });
        }
        skipped++;
        continue;
      }

      await prisma.linkedInAccount.create({
        data: {
          linkedinName: app.fullName,
          linkedinUrl: app.linkedinUrl,
          connectionCount: app.connectionCount || 0,
          industry: app.industry || null,
          location: app.location || null,
          status: "under_review",
          ambassadorPayment: app.offeredAmount || 0,
          notes: `Owner: ${app.email}. Profile email: ${app.linkedinEmail || app.email}.`,
        },
      });
      created++;
    }

    return NextResponse.json({
      success: true,
      created,
      skipped,
      total: applications.length,
    });
  } catch (error) {
    if (error instanceof Error && (error.message === "Forbidden" || error.message === "Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: error.message === "Forbidden" ? 403 : 401 });
    }
    console.error("Backfill error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
