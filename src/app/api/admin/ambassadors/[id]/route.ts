import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["pending", "reviewing", "approved", "rejected", "onboarded", "unreachable", "contacted", "on_hold"]).optional(),
  offeredAmount: z.number().optional(),
  adminNotes: z.string().optional(),
  // editable applicant details (filled in as info comes in)
  fullName: z.string().optional(),
  contactNumber: z.string().nullable().optional(),
  linkedinEmail: z.string().nullable().optional(),
  linkedinUrl: z.string().optional(),
  connectionCount: z.number().nullable().optional(),
  location: z.string().nullable().optional(),
  referralSource: z.string().nullable().optional(),
  referredBy: z.string().nullable().optional(),
  bookingEmail: z.string().nullable().optional(),
  poc: z.string().optional(),
  nextFollowUp: z.string().datetime().nullable().optional(),
  callOutcome: z.enum(["no_show", "completed"]).nullable().optional(),
  accountFreshness: z.enum(["established", "fresh"]).nullable().optional(),
  onboardedAt: z.string().datetime().nullable().optional(),
  verifiedAt: z.string().datetime().nullable().optional(),
  paidAt: z.string().datetime().nullable().optional(),
  marketerPaidAt: z.string().datetime().nullable().optional(),
  // Owner payout details
  paymentMethod: z.string().nullable().optional(),
  paymentDetails: z.string().nullable().optional(),
  // Recurring ₱500/month payout: append a receipt, or remove one by index.
  addMonthlyPayout: z.object({ amount: z.number(), note: z.string().optional() }).optional(),
  removeMonthlyPayout: z.number().int().optional(),
  addTouch: z.object({
    ch: z.enum(["whatsapp", "email", "call", "text", "reply", "booked", "done", "note"]),
    text: z.string().min(1),
    by: z.string().optional(),
  }).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const { addTouch, addMonthlyPayout, removeMonthlyPayout, nextFollowUp, onboardedAt, verifiedAt, paidAt, marketerPaidAt, ...rest } = updateSchema.parse(body);

    // Get the current application before updating
    const currentApp = await prisma.ambassadorApplication.findUnique({ where: { id } });
    if (!currentApp) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const updateData: Prisma.AmbassadorApplicationUpdateInput = { ...rest };
    if (nextFollowUp !== undefined) updateData.nextFollowUp = nextFollowUp ? new Date(nextFollowUp) : null;
    if (onboardedAt !== undefined) updateData.onboardedAt = onboardedAt ? new Date(onboardedAt) : null;
    if (verifiedAt !== undefined) updateData.verifiedAt = verifiedAt ? new Date(verifiedAt) : null;
    if (paidAt !== undefined) updateData.paidAt = paidAt ? new Date(paidAt) : null;
    if (marketerPaidAt !== undefined) updateData.marketerPaidAt = marketerPaidAt ? new Date(marketerPaidAt) : null;
    if (addTouch) {
      const log = Array.isArray(currentApp.outreachLog) ? (currentApp.outreachLog as unknown[]) : [];
      updateData.outreachLog = [
        ...log,
        { ch: addTouch.ch, text: addTouch.text, by: addTouch.by?.trim() || admin.fullName || admin.email, at: new Date().toISOString() },
      ] as Prisma.InputJsonValue;
    }
    if (addMonthlyPayout || removeMonthlyPayout !== undefined) {
      let payouts = Array.isArray(currentApp.monthlyPayouts) ? (currentApp.monthlyPayouts as unknown[]) : [];
      if (removeMonthlyPayout !== undefined) {
        payouts = payouts.filter((_, i) => i !== removeMonthlyPayout);
      }
      if (addMonthlyPayout) {
        payouts = [
          ...payouts,
          { paidAt: new Date().toISOString(), amount: addMonthlyPayout.amount, note: addMonthlyPayout.note?.trim() || null, by: admin.fullName || admin.email },
        ];
      }
      updateData.monthlyPayouts = payouts as Prisma.InputJsonValue;
    }

    const application = await prisma.ambassadorApplication.update({
      where: { id },
      data: updateData,
    });

    // When onboarded, flip the account live (out of under_review) so it shows on the owners page.
    if (rest.status === "onboarded" && currentApp.status !== "onboarded") {
      await prisma.linkedInAccount.updateMany({
        where: { linkedinUrl: application.linkedinUrl, status: "under_review" },
        data: { status: "available" },
      });
    }

    // When status changes to "approved", automatically create a LinkedInAccount
    if (rest.status === "approved" && currentApp.status !== "approved") {
      // Check if a LinkedInAccount already exists for this LinkedIn URL
      const existingAccount = await prisma.linkedInAccount.findFirst({
        where: { linkedinUrl: application.linkedinUrl },
      });

      if (!existingAccount) {
        await prisma.linkedInAccount.create({
          data: {
            linkedinName: application.fullName,
            linkedinUrl: application.linkedinUrl,
            connectionCount: application.connectionCount || 0,
            industry: application.industry || null,
            location: application.location || null,
            status: "under_review",
            ambassadorPayment: application.offeredAmount || 0,
            notes: `Owner: ${application.email}. Profile email: ${application.linkedinEmail || application.email}.`,
          },
        });
      }
    }

    return NextResponse.json({ application });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    if (error instanceof Error && (error.message === "Forbidden" || error.message === "Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: error.message === "Forbidden" ? 403 : 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Permanently remove a signup (e.g. clearing test data). Does not touch any
// LinkedInAccount already created from it.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    await prisma.ambassadorApplication.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && (error.message === "Forbidden" || error.message === "Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: error.message === "Forbidden" ? 403 : 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
