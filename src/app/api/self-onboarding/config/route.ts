import { NextResponse } from "next/server";
import { currencyConfig } from "@/lib/referral-currency";
import { onboardingCountries, DIY_REFERRER_SLUG } from "@/lib/self-service-onboarding";
import { proxyPurchaseLimits, PURCHASE_PROXY_COUNTRIES } from "@/services/proxy-cheap";
import { countries as ALL_COUNTRIES } from "@/lib/countries";

export const dynamic = "force-dynamic";

// Public config for the DIY details form. `countries` is the FULL list (people from anywhere
// can sign up); `provisionable` is where we can spin up an account instantly right now
// (existing residential capacity + purchasable countries). A country outside `provisionable`
// is captured as a lead by /start instead of a stuck session.
export async function GET() {
  const [existing] = await Promise.all([onboardingCountries()]);
  const autoPurchase = proxyPurchaseLimits().enabled;
  const provisionable = [...new Set([...existing, ...(autoPurchase ? PURCHASE_PROXY_COUNTRIES : [])])].sort();
  const cfg = currencyConfig(DIY_REFERRER_SLUG);
  return NextResponse.json(
    { countries: ALL_COUNTRIES.map((c) => c.name), provisionable, autoPurchase, payoutMethods: cfg.payoutMethods, defaultPayoutMethod: cfg.defaultPayoutMethod, symbol: cfg.symbol },
    { headers: { "Cache-Control": "no-store" } },
  );
}
