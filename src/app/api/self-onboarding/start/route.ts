import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { selfServiceInput } from "@/lib/self-service-input";
import { OnboardingError, reserveOnboarding, mintSelfToken, onboardingSummary, onboardingCountries, DIY_REFERRER_SLUG } from "@/lib/self-service-onboarding";
import { verifyPermit } from "@/lib/self-onboarding-gate";
import { countryCode } from "@/lib/countries";
import { proxyPurchaseLimits, PURCHASE_PROXY_COUNTRIES } from "@/services/proxy-cheap";

export const dynamic = "force-dynamic";
export const maxDuration = 120;
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });

const DIY_TIERS = ["standard", "partial", "full"] as const;
type DiyTier = (typeof DIY_TIERS)[number];

// Public DIY self-onboarding: verify the email gate, then either start a live onboarding
// (provisionable countries) or capture a lead (anywhere else) so nobody is left stuck.
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

    // Can we spin up an account for this country instantly? (residential capacity + purchasable)
    const code = countryCode(parsed.data.country);
    const residential = await onboardingCountries();
    const provisionable = !!code && (residential.includes(code) || (proxyPurchaseLimits().enabled && (PURCHASE_PROXY_COUNTRIES as readonly string[]).includes(code)));

    if (!provisionable) {
      // No instant capacity here yet — capture as a lead so the team can set them up.
      const dup = await prisma.ambassadorApplication.findFirst({ where: { OR: [{ email: { equals: parsed.data.email, mode: "insensitive" } }, { linkedinUrl: parsed.data.linkedinUrl }] }, select: { id: true } });
      if (!dup) {
        await prisma.ambassadorApplication.create({ data: {
          fullName: parsed.data.fullName, email: parsed.data.email, linkedinEmail: parsed.data.email,
          linkedinUrl: parsed.data.linkedinUrl, location: parsed.data.country, contactNumber: parsed.data.contactNumber,
          paymentMethod: parsed.data.paymentMethod, paymentDetails: parsed.data.paymentDetails, payoutName: parsed.data.payoutName,
          referredBy: diy.slug, referralSource: "DIY page", status: "pending", ownerStatus: "onboarding",
          ...(tier ? { diyTier: tier } : {}),
          adminNotes: `DIY self-serve signup from a non-provisionable country (${parsed.data.country}). Needs manual proxy/setup.`,
        } });
      }
      return json({ lead: true, country: parsed.data.country });
    }

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
