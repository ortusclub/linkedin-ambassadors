import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { currencyConfig } from "@/lib/referral-currency";
import { selfServiceInput, selfServiceAction } from "@/lib/self-service-input";
import { proxyPurchaseLimits } from "@/services/proxy-cheap";
import { emailSetupConfig, EmailSetupError } from "@/lib/onboarding-email-policy";
import { requireEmailSetup } from "@/lib/onboarding-email";
import { OnboardingError, onboardingCountries, onboardingSummary, reserveOnboarding, prepareOnboarding, confirmOnboarding } from "@/lib/self-service-onboarding";

export const dynamic = "force-dynamic";
export const maxDuration = 120;
type Context = { params: Promise<{ token: string }> };
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });

async function authenticate(context: Context, req?: Request) {
  if (req) {
    const origin = req.headers.get("origin");
    if (origin && origin !== new URL(req.url).origin) throw new OnboardingError("Request origin not allowed.", 403);
  }
  const { token } = await context.params;
  const me = await prisma.referrer.findUnique({ where: { token } });
  if (!me || !me.active) throw new OnboardingError("This referral portal is not available.", 404);
  return me;
}

function failure(error: unknown, operation: "load" | "save" = "save") {
  if (error instanceof EmailSetupError) return json({ error: error.message }, error.status);
  // Log diagnostic identifiers only; full Prisma errors may contain private inputs.
  if (!(error instanceof OnboardingError)) {
    const known = error instanceof Prisma.PrismaClientKnownRequestError ? error : null;
    console.error("Onboarding request failed", {
      operation, kind: error instanceof Error ? error.name : "Unknown",
      code: known?.code, model: known?.meta?.modelName, column: known?.meta?.column,
      field: error instanceof Error ? error.message.match(/Unknown (?:argument|field) `([^`]+)`/)?.[1] : undefined,
    });
  }
  if (error instanceof OnboardingError) return json({ error: error.message }, error.status);
  if (error instanceof SyntaxError) return json({ error: "Invalid request." }, 400);
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
    return json({ error: "Onboarding is not enabled in this database yet. The team needs to apply the onboarding database migration." }, 503);
  }
  // Provider payloads and database errors can contain secrets; don't return or log them.
  return json({ error: operation === "load" ? "We couldn't load onboarding. Please refresh and try again." : "We couldn't save your progress. Please refresh and try again." }, 500);
}

export async function GET(req: Request, context: Context) {
  try {
    const me = await authenticate(context);
    const id = new URL(req.url).searchParams.get("id");
    if (id && !selfServiceAction.shape.id.safeParse(id).success) return json({ error: "Invalid onboarding reference." }, 400);
    if (id) return json({ session: await onboardingSummary(id, me.id) });
    const [countries, sessions] = await Promise.all([
      onboardingCountries(),
      prisma.selfServiceOnboarding.findMany({ where: { referrerId: me.id }, orderBy: { createdAt: "desc" }, take: 30, select: { id: true, state: true, application: { select: { fullName: true } } } }),
    ]);
    return json({ emailEnabled: emailSetupConfig().enabled, countries, autoPurchase: proxyPurchaseLimits().enabled, config: currencyConfig(me.slug), configured: !!process.env.GOLOGIN_API_TOKEN_KLABBER,
      sessions: sessions.map((s) => ({ id: s.id, state: s.state, name: s.application.fullName })) });
  } catch (error) { return failure(error, "load"); }
}

export async function POST(req: Request, context: Context) {
  try {
    const me = await authenticate(context, req);
    if (!process.env.GOLOGIN_API_TOKEN_KLABBER) throw new OnboardingError("Browser setup is not configured yet.", 503);
    const parsed = selfServiceInput.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.issues[0]?.message || "Please check the details." }, 400);
    const id = await reserveOnboarding(me, parsed.data);
    return json({ session: await onboardingSummary(id, me.id) });
  } catch (error) { return failure(error); }
}

export async function PATCH(req: Request, context: Context) {
  try {
    const me = await authenticate(context, req);
    const parsed = selfServiceAction.safeParse(await req.json());
    if (!parsed.success) return json({ error: "Invalid onboarding action." }, 400);
    const { id, action } = parsed.data;
    await requireEmailSetup(id, me.id);
    if (action === "prepare") await prepareOnboarding(id, me.id);
    if (action === "opened") {
      const updated = await prisma.selfServiceOnboarding.updateMany({ where: { id, referrerId: me.id, state: "ready" }, data: { openedAt: new Date() } });
      if (!updated.count) throw new OnboardingError("The browser is not ready to open yet.", 409);
    }
    if (action === "confirm") await confirmOnboarding(id, me.id);
    return json({ session: await onboardingSummary(id, me.id) });
  } catch (error) { return failure(error); }
}
