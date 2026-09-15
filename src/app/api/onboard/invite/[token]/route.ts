import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { currencyConfig } from "@/lib/referral-currency";
import { selfServiceInput, ownerCredentials } from "@/lib/self-service-input";
import { proxyPurchaseLimits } from "@/services/proxy-cheap";
import { emailSetupConfig } from "@/lib/onboarding-email-policy";
import { OnboardingError, onboardingCountries, reserveOnboarding, captureOnboardingCredentials, inviteForOwner, markInviteFilled } from "@/lib/self-service-onboarding";
import { phoneVerificationConfigured } from "@/lib/phone-verification";

export const dynamic = "force-dynamic";
export const maxDuration = 120;
type Context = { params: Promise<{ token: string }> };
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });

// Owner intake reached via a per-owner invite link. The invite carries the owner's name
// and its referrer; the referrer can watch its status once the owner submits.
async function resolve(context: Context, req?: Request) {
  if (req) {
    const origin = req.headers.get("origin");
    if (origin && origin !== new URL(req.url).origin) throw new OnboardingError("Request origin not allowed.", 403);
  }
  const { token } = await context.params;
  const invite = await inviteForOwner(token);
  if (!invite) throw new OnboardingError("This onboarding link is not available.", 404);
  const me = await prisma.referrer.findUnique({ where: { id: invite.referrerId } });
  if (!me || !me.active) throw new OnboardingError("This onboarding link is not available.", 404);
  return { invite, me };
}

function failure(error: unknown) {
  if (error instanceof OnboardingError) return json({ error: error.message }, error.status);
  if (error instanceof SyntaxError) return json({ error: "Invalid request." }, 400);
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") return json({ error: "Onboarding is not enabled in this database yet." }, 503);
  console.error("Owner invite intake failed", { kind: error instanceof Error ? error.name : "Unknown" });
  return json({ error: "We couldn't save your details. Please refresh and try again." }, 500);
}

export async function GET(_req: Request, context: Context) {
  try {
    const { invite, me } = await resolve(context);
    const [countries] = await Promise.all([onboardingCountries()]);
    const cfg = currencyConfig(me.slug);
    return json({
      referrerName: me.name, slug: me.slug, ownerName: invite.ownerName, alreadyFilled: !!invite.filledAt,
      countries, payoutMethods: cfg.payoutMethods,
      emailEnabled: emailSetupConfig().enabled, phoneVerificationEnabled: phoneVerificationConfigured(),
      autoPurchase: proxyPurchaseLimits().enabled, configured: !!process.env.GOLOGIN_API_TOKEN_KLABBER, offer: cfg.offer,
    });
  } catch (error) { return failure(error); }
}

export async function POST(req: Request, context: Context) {
  try {
    const { invite, me } = await resolve(context, req);
    if (!process.env.GOLOGIN_API_TOKEN_KLABBER) throw new OnboardingError("Onboarding setup is not ready yet. Please try again shortly.", 503);
    const body = await req.json();
    const parsed = selfServiceInput.safeParse(body);
    if (!parsed.success) return json({ error: parsed.error.issues[0]?.message || "Please check the details you entered." }, 400);
    const creds = ownerCredentials.safeParse(body);
    if (!creds.success) return json({ error: "Set a temporary password of at least 6 characters." }, 400);
    const id = await reserveOnboarding({ id: me.id, slug: me.slug, name: me.name }, parsed.data);
    await captureOnboardingCredentials(id, me.id, creds.data);
    await markInviteFilled(invite.token, id);
    return json({ ok: true, id, name: parsed.data.fullName });
  } catch (error) { return failure(error); }
}
