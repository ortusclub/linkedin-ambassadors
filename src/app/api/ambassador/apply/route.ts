import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { assessFromApplication } from "@/services/profile-assessor";
import { sendAmbassadorApplicationLead } from "@/services/email";

const applySchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  linkedinEmail: z.string().email().optional(),
  contactNumber: z.string().optional(),
  linkedinUrl: z.string().optional(),
  connectionCount: z.number().int().optional(),
  industry: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  referralSource: z.string().optional(),
  referredBy: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = applySchema.parse(body);
    const linkedinUrl = data.linkedinUrl || "";
    const hasUrl = linkedinUrl.length > 0;

    // Canonicalize a referral code to the matching referrer's slug, so a manually-typed
    // code ("Lewis-4823", "lewis 4823", "LEWIS-4823") credits the same person as the QR.
    let referredBy = data.referredBy?.trim() || undefined;
    if (referredBy) {
      const norm = referredBy.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      const match = norm ? await prisma.referrer.findUnique({ where: { slug: norm } }) : null;
      if (match) referredBy = match.slug;
    }

    // Leads without a LinkedIn URL (e.g. a field-day walk-up who skipped the valuation)
    // are captured as "pending" for the team to follow up — no auto-assessment or account.
    // Only run the duplicate check when we actually have a URL to match on.
    if (hasUrl) {
      const existing = await prisma.ambassadorApplication.findFirst({
        where: { email: data.email, linkedinUrl, status: { in: ["pending", "reviewing", "approved"] } },
      });
      if (existing) {
        return NextResponse.json(
          { error: "You already have an active application for this account" },
          { status: 409 }
        );
      }
    }

    // Auto-assess the profile — only when we have a URL to value.
    const assessment = hasUrl
      ? assessFromApplication({
          connectionCount: data.connectionCount,
          industry: data.industry,
          location: data.location,
          notes: data.notes,
        })
      : null;

    // Create application with auto-assessment results (or as a pending lead).
    const application = await prisma.ambassadorApplication.create({
      data: {
        ...data,
        linkedinUrl,
        referredBy,
        status: assessment ? (assessment.autoApproved ? "approved" : "reviewing") : "pending",
        offeredAmount: assessment?.offeredAmount,
        adminNotes: assessment
          ? `Auto-assessed: Score ${assessment.score}/100, Tier: ${assessment.tier}. ${assessment.breakdown.map((b) => `${b.category}: ${b.points}/${b.maxPoints}`).join(", ")}`
          : "Lead captured without LinkedIn URL — pending follow-up.",
      },
    });

    // If auto-approved, create a LinkedInAccount automatically
    if (assessment?.autoApproved) {
      const existingAccount = await prisma.linkedInAccount.findFirst({
        where: { linkedinUrl },
      });
      if (!existingAccount) {
        await prisma.linkedInAccount.create({
          data: {
            linkedinName: data.fullName,
            linkedinUrl,
            connectionCount: data.connectionCount || 0,
            industry: data.industry || null,
            location: data.location || null,
            status: "under_review",
            ambassadorPayment: assessment.offeredAmount,
            notes: `Owner: ${data.email}. Profile email: ${data.linkedinEmail || data.email}.`,
          },
        });
      }
    }

    try {
      await sendAmbassadorApplicationLead({
        fullName: data.fullName,
        email: data.email,
        linkedinEmail: data.linkedinEmail,
        contactNumber: data.contactNumber,
        linkedinUrl,
        connectionCount: data.connectionCount,
        industry: data.industry,
        location: data.location,
        notes: data.notes,
        status: application.status,
        offeredAmount: assessment?.offeredAmount,
      });
    } catch (emailError) {
      console.error("Ambassador lead email failed:", emailError);
    }

    return NextResponse.json({
      application,
      assessment: assessment
        ? {
            score: assessment.score,
            tier: assessment.tier,
            offeredAmount: assessment.offeredAmount,
            breakdown: assessment.breakdown,
            autoApproved: assessment.autoApproved,
          }
        : null,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Ambassador apply error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
