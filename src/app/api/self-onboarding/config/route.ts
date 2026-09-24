import { NextResponse } from "next/server";
import { currencyConfig } from "@/lib/referral-currency";
import { onboardingCountries, DIY_REFERRER_SLUG } from "@/lib/self-service-onboarding";
import { proxyPurchaseLimits, PURCHASE_PROXY_COUNTRIES } from "@/services/proxy-cheap";

export const dynamic = "force-dynamic";

// Public config for the DIY details form: the countries onboarding can actually start in
// right now (existing residential capacity, plus purchasable countries when auto-buy is on)
// and the payout methods. No secrets.
export async function GET() {
  const [existing] = await Promise.all([onboardingCountries()]);
  const autoPurchase = proxyPurchaseLimits().enabled;
  const countries = [...new Set([...existing, ...(autoPurchase ? PURCHASE_PROXY_COUNTRIES : [])])].sort();
  const cfg = currencyConfig(DIY_REFERRER_SLUG);
  return NextResponse.json(
    { countries, autoPurchase, payoutMethods: cfg.payoutMethods, defaultPayoutMethod: cfg.defaultPayoutMethod, symbol: cfg.symbol },
    { headers: { "Cache-Control": "no-store" } },
  );
}
