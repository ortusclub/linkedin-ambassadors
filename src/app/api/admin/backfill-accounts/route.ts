import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// One-time backfill — DELETE THIS FILE after use
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("key") !== "klabber-backfill-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const applications = await prisma.ambassadorApplication.findMany({
      where: { status: { in: ["approved", "onboarded"] } },
    });

    let created = 0;
    let skipped = 0;

    for (const app of applications) {
      const existing = await prisma.linkedInAccount.findFirst({
        where: { linkedinUrl: app.linkedinUrl },
      });

      if (existing) {
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

    return NextResponse.json({ success: true, created, skipped, total: applications.length });
  } catch (error) {
    console.error("Backfill error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
