import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";

// Transfer a referred self-service onboarding to LV: the referrer is no longer doing the
// onboarding work, so the commission reverts to the BASE referral tier. Setting
// onboardingMethod="team_meeting" makes referralCommissionAmount() return tiers.referral
// (e.g. ₱500) regardless of what DIY band it was on. The row moves into our queue so the
// team finishes the sign-in / onboarding. Distinct from verify-signin "takeover", which
// keeps the referrer on the email/2FA band (₱600/₱800) because they still did email+2FA.
const schema = z.object({ id: z.string().min(1) });

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const { id } = schema.parse(await req.json());
    const app = await prisma.ambassadorApplication.findUnique({
      where: { id },
      select: { id: true, status: true, outreachLog: true, selfServiceOnboarding: { select: { id: true } } },
    });
    if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });
    if (app.status === "onboarded") {
      return NextResponse.json({ error: "This onboarding is already complete — nothing to transfer." }, { status: 409 });
    }
    const sessionId = app.selfServiceOnboarding?.id;
    const log = Array.isArray(app.outreachLog) ? (app.outreachLog as unknown[]) : [];

    await prisma.$transaction(async (tx) => {
      await tx.ambassadorApplication.update({
        where: { id },
        data: {
          onboardingMethod: "team_meeting", // → base referral commission tier
          ownerStatus: "onboarding",
          accountIssue: "",
          outreachLog: [
            ...log,
            { ch: "note", text: "🔄 Onboarding transferred to LV — referral reverts to the base referral tier (team handles the rest of the onboarding).", by: admin.fullName || admin.email, at: new Date().toISOString() },
          ] as Prisma.InputJsonValue,
        },
      });
      // Surface it in our "needs sign-in" queue.
      if (sessionId) await tx.selfServiceOnboarding.update({ where: { id: sessionId }, data: { state: "handed_off" } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    if (error instanceof Error && error.message === "Forbidden") return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
