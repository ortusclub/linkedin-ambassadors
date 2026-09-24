import { NextResponse } from "next/server";
import { currencyConfig } from "@/lib/referral-currency";
import { onboardingCountries, DIY_REFERRER_SLUG } from "@/lib/self-service-onboarding";

export const dynamic = "force-dynamic";

// Public config for the DIY details form: the valid country list (so reserve won't reject
// the country) and the payout methods. No secrets.
export async function GET() {
  const [countries] = await Promise.all([onboardingCountries()]);
  const cfg = currencyConfig(DIY_REFERRER_SLUG);
  return NextResponse.json(
    { countries, payoutMethods: cfg.payoutMethods, defaultPayoutMethod: cfg.defaultPayoutMethod, symbol: cfg.symbol },
    { headers: { "Cache-Control": "no-store" } },
  );
}
