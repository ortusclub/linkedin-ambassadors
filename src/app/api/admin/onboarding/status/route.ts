import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

// Move an application along the onboarding pipeline. Writes the real
// AmbassadorStatus, so this page and the Applications page never disagree.
//
// Guardrail: you can't mark someone onboarded until the account we hold for them
// has a GoLogin profile or share link — without one the account can't be run, so
// "onboarded" would be a lie. That's what let 25 applications end up marked
// onboarded with no GoLogin behind them.

const schema = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "reviewing", "approved", "rejected", "onboarding", "onboarded", "unreachable", "contacted", "on_hold"]),
});

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { id, status } = schema.parse(await req.json());

    const app = await prisma.ambassadorApplication.findUnique({
      where: { id },
      select: { id: true, email: true, fullName: true, linkedinUrl: true, status: true, onboardingStartedAt: true, onboardedAt: true },
    });
    if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });

    if (status === "onboarded") {
      const accounts = await prisma.linkedInAccount.findMany({
        where: { status: { notIn: ["removed"] } },
        select: { linkedinUrl: true, notes: true, gologinProfileId: true, gologinShareLink: true },
      });
      const acct = accounts.find((a) => {
        const owner = (a.notes || "").match(/Owner:\s*(\S+@\S+)/)?.[1]?.replace(/\.$/, "");
        if (owner && owner.toLowerCase() === app.email.toLowerCase()) return true;
        return !!app.linkedinUrl && !!a.linkedinUrl && a.linkedinUrl.replace(/\/$/, "") === app.linkedinUrl.replace(/\/$/, "");
      });

      if (!acct) {
        return NextResponse.json({ error: "No LinkedIn account is linked to this application yet — it can't be marked onboarded." }, { status: 400 });
      }
      if (!acct.gologinProfileId && !acct.gologinShareLink) {
        return NextResponse.json({ error: "This account has no GoLogin profile or share link, so it can't be run. Add a GoLogin before marking it onboarded." }, { status: 400 });
      }
    }

    const updated = await prisma.ambassadorApplication.update({
      where: { id },
      data: {
        status,
        // Stamp when the onboarding (warm-up) process starts — drives the "log in due" nudge.
        ...(status === "onboarding" && !app.onboardingStartedAt ? { onboardingStartedAt: new Date() } : {}),
        // Stamp the login/in-hand date the first time it reaches onboarded — the payout
        // schedule (setup fee = login + 24h) is anchored on it, so it must not be left null.
        ...(status === "onboarded" && !app.onboardedAt ? { onboardedAt: new Date() } : {}),
      },
      select: { id: true, fullName: true, status: true, onboardedAt: true },
    });

    // Being accepted / entering onboarding surfaces the offline profile so credentials can
    // be added: flip any hidden under_review account for this owner to unavailable.
    if (status === "approved" || status === "onboarding") {
      await prisma.linkedInAccount.updateMany({
        where: {
          status: "under_review",
          OR: [
            { notes: { contains: `Owner: ${app.email}` } },
            ...(app.linkedinUrl ? [{ linkedinUrl: app.linkedinUrl }] : []),
          ],
        },
        data: { status: "unavailable" },
      });
    }

    return NextResponse.json({ application: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    if (error instanceof Error && (error.message === "Forbidden" || error.message === "Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
