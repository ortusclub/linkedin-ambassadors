import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { selfServiceInput } from "@/lib/self-service-input";
import { OnboardingError, reserveOnboarding, mintSelfToken, onboardingSummary, DIY_REFERRER_SLUG } from "@/lib/self-service-onboarding";
import { verifyPermit } from "@/lib/self-onboarding-gate";

export const dynamic = "force-dynamic";
export const maxDuration = 120;
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });

const DIY_TIERS = ["standard", "partial", "full"] as const;
type DiyTier = (typeof DIY_TIERS)[number];

// Public DIY self-onboarding: verify the email gate, then start a live onboarding. Works for
// ANY country — the proxy follows the standard rules (reuse a proxy under its 4-account cap,
// else buy the cheapest from an approved country); the account country need not match.
export async function POST(req: Request) {
  try {
    const origin = req.headers.get("origin");
    if (origin && origin !== new URL(req.url).origin) return json({ error: "Request origin not allowed." }, 403);
    if (!process.env.GOLOGIN_API_TOKEN_KLABBER) return json({ error: "Onboarding is not available right now." }, 503);

    const raw = await req.json();
    const permit = typeof raw?.permit === "string" ? raw.permit : "";
    const tier: DiyTier | null = DIY_TIERS.includes(raw?.tier) ? raw.tier : null;
    const parsed = selfServiceInput.safeParse(raw);
    if (!parsed.success) return json({ error: parsed.error.issues[0]?.message || "Please check your details." }, 400);
    if (!verifyPermit(permit, parsed.data.email)) return json({ error: "Please verify your email first." }, 403);

    const diy = await prisma.referrer.findUnique({ where: { slug: DIY_REFERRER_SLUG }, select: { id: true, slug: true, name: true, type: true } });
    if (!diy) return json({ error: "Onboarding is not available right now." }, 503);

    const id = await reserveOnboarding(diy, parsed.data);
    // Record the chosen tier on the freshly-created application so payouts pay the right bonus.
    if (tier) {
      const s = await prisma.selfServiceOnboarding.findUnique({ where: { id }, select: { applicationId: true } });
      if (s) await prisma.ambassadorApplication.update({ where: { id: s.applicationId }, data: { diyTier: tier } });
    }
    const token = await mintSelfToken(id);
    return json({ token, session: await onboardingSummary(id, diy.id) });
  } catch (error) {
    if (error instanceof OnboardingError) return json({ error: error.message }, error.status);
    return json({ error: "We couldn't start your onboarding. Please try again." }, 500);
  }
}
