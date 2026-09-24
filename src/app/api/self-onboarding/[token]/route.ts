import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currencyConfig } from "@/lib/referral-currency";
import { selfServiceAction, selfServiceConfirm } from "@/lib/self-service-input";
import { proxyPurchaseLimits } from "@/services/proxy-cheap";
import { emailSetupConfig } from "@/lib/onboarding-email-policy";
import { requireEmailSetup } from "@/lib/onboarding-email";
import { OnboardingError, onboardingCountries, onboardingSummary, prepareOnboarding, confirmOnboarding, saveTwoFactorKey, resolveSelfSession } from "@/lib/self-service-onboarding";

export const dynamic = "force-dynamic";
export const maxDuration = 120;
type Context = { params: Promise<{ token: string }> };
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });

// Per-session mirror of the referrer onboarding API for the public DIY flow. A publicToken
// authorizes exactly ONE session — never a referrer, never a list — so it can only ever see
// or touch its own onboarding. Reuses the onboarding library; the referral routes are untouched.
function fail(error: unknown, op: "load" | "save" = "save") {
  if (error instanceof OnboardingError) return json({ error: error.message }, error.status);
  return json({ error: op === "load" ? "We couldn't load your onboarding. Please refresh." : "We couldn't save your progress. Please refresh and try again." }, 500);
}

export async function GET(req: Request, context: Context) {
  try {
    const { token } = await context.params;
    const { sessionId, referrerId, referrerSlug } = await resolveSelfSession(token);
    // Any ?id is ignored — this token only ever refers to its own session.
    if (new URL(req.url).searchParams.get("id")) return json({ session: await onboardingSummary(sessionId, referrerId) });
    const [countries, session] = await Promise.all([
      onboardingCountries(),
      prisma.selfServiceOnboarding.findUnique({ where: { id: sessionId }, select: { id: true, state: true, application: { select: { fullName: true } } } }),
    ]);
    return json({
      emailEnabled: emailSetupConfig().enabled, phoneVerificationEnabled: false,
      countries, autoPurchase: proxyPurchaseLimits().enabled, config: currencyConfig(referrerSlug),
      configured: !!process.env.GOLOGIN_API_TOKEN_KLABBER, doneComputer: false, donePhone: false,
      sessions: session ? [{ id: session.id, state: session.state, name: session.application.fullName }] : [],
    });
  } catch (error) { return fail(error, "load"); }
}

export async function PATCH(req: Request, context: Context) {
  try {
    const { token } = await context.params;
    const origin = req.headers.get("origin");
    if (origin && origin !== new URL(req.url).origin) throw new OnboardingError("Request origin not allowed.", 403);
    const { sessionId, referrerId } = await resolveSelfSession(token);
    const body = await req.json();
    const bodyId = (body as { id?: unknown })?.id;
    // Security: a self-token may only act on its OWN session.
    if (typeof bodyId === "string" && bodyId !== sessionId) throw new OnboardingError("Not found.", 404);

    if ((body as { action?: string })?.action === "twofactor") {
      const b = body as { twoFactorKey?: unknown };
      if (typeof b.twoFactorKey !== "string" || b.twoFactorKey.length > 128) return json({ error: "Invalid 2FA key." }, 400);
      await saveTwoFactorKey(sessionId, referrerId, b.twoFactorKey);
      return json({ session: await onboardingSummary(sessionId, referrerId) });
    }
    if ((body as { action?: string })?.action === "confirm") {
      const confirm = selfServiceConfirm.safeParse({ ...body, id: sessionId });
      if (!confirm.success) return json({ error: "Invalid confirmation details." }, 400);
      await requireEmailSetup(sessionId, referrerId);
      await confirmOnboarding(sessionId, referrerId, { password: confirm.data.password, twoFactorKey: confirm.data.twoFactorKey });
      return json({ session: await onboardingSummary(sessionId, referrerId) });
    }
    const parsed = selfServiceAction.safeParse({ ...body, id: sessionId });
    if (!parsed.success) return json({ error: "Invalid onboarding action." }, 400);
    const { action } = parsed.data;
    await requireEmailSetup(sessionId, referrerId);
    if (action === "prepare") await prepareOnboarding(sessionId, referrerId);
    if (action === "opened") {
      const updated = await prisma.selfServiceOnboarding.updateMany({ where: { id: sessionId, referrerId, state: "ready" }, data: { openedAt: new Date() } });
      if (!updated.count) throw new OnboardingError("The browser is not ready to open yet.", 409);
    }
    if (action === "confirm") await confirmOnboarding(sessionId, referrerId);
    return json({ session: await onboardingSummary(sessionId, referrerId) });
  } catch (error) { return fail(error); }
}
