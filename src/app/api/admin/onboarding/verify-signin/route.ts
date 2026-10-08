import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

// Resolve a self-service PC sign-in that a referrer self-reported. There's no automated way to
// confirm the GoLogin actually signed into LinkedIn, so an admin opens the profile and records
// the outcome here:
//   confirm  — it's genuinely signed in: stamp onboardedAt (logged in), clear the flag, move to QC.
//   retry    — not signed in: reopen the referrer's sign-in step so they can try again (stays
//              full-service tier); the team nudges them via Chase an issue.
//   takeover — not signed in and we'll do it: flip to the email/2FA tier (onboardingMethod=phone,
//              so the referrer commission drops to that band) and hand it to our sign-in queue.
const schema = z.object({ id: z.string().min(1), action: z.enum(["confirm", "retry", "takeover"]) });

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { id, action } = schema.parse(await req.json());
    const app = await prisma.ambassadorApplication.findUnique({
      where: { id },
      select: { id: true, selfServiceOnboarding: { select: { id: true } } },
    });
    if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });
    const sessionId = app.selfServiceOnboarding?.id;

    if (action === "confirm") {
      await prisma.ambassadorApplication.update({
        where: { id },
        data: { status: "approved", onboardedAt: new Date(), accountIssue: "" },
      });
    } else if (action === "retry") {
      await prisma.$transaction(async (tx) => {
        await tx.ambassadorApplication.update({
          where: { id },
          data: { accountIssue: "Sign-in did not take — referrer asked to retry the GoLogin sign-in." },
        });
        // state "ready" reopens the referrer's sign-in step (they resume via ?session=).
        if (sessionId) await tx.selfServiceOnboarding.update({ where: { id: sessionId }, data: { state: "ready" } });
      });
    } else {
      await prisma.$transaction(async (tx) => {
        await tx.ambassadorApplication.update({
          where: { id },
          data: {
            onboardingMethod: "phone", // → email/2FA commission band; the referrer did email+2FA, we sign in
            ownerStatus: "onboarding",
            accountIssue: "Full-service sign-in failed — LV taking over the GoLogin sign-in (commission tier → email/2FA).",
          },
        });
        // state "handed_off" surfaces it in our "needs sign-in" queue.
        if (sessionId) await tx.selfServiceOnboarding.update({ where: { id: sessionId }, data: { state: "handed_off" } });
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    if (error instanceof Error && error.message === "Forbidden") return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
