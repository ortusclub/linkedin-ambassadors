// Per-referrer currency for the marketer/referrer portal (/m/[token]) and its API.
//
// The portal was built PH-only (pesos, GCash/Maya). As we open the referral
// programme to non-PH people (India first), each such referrer needs their own
// currency, offer amounts and payout methods. There is deliberately NO DB column
// for this yet — there are only a handful of USD referrers, so a code list is
// simpler and avoids a schema migration. Add a slug to USD_SLUGS to flip that
// referrer's portal to USD.
//
// Confirmed USD offer (Sam, 2026-09-02): referrer $8 / accepted signup (uncapped);
// ambassador they refer earns $16 set-up + $8/month.

export type Currency = "PHP" | "USD";

const USD_SLUGS = new Set<string>([
  "aditya-39", // India — first non-PH referrer
]);

export function referralCurrency(slug: string): Currency {
  return USD_SLUGS.has((slug || "").trim().toLowerCase()) ? "USD" : "PHP";
}

export interface CurrencyConfig {
  currency: Currency;
  symbol: string;
  rate: number; // commission per onboarded signup, in this currency
  offer: { setup: string; monthly: string }; // what the ambassador they refer earns
  payoutMethods: string[];
  defaultPayoutMethod: string;
}

export const CURRENCY_CONFIG: Record<Currency, CurrencyConfig> = {
  PHP: {
    currency: "PHP",
    symbol: "₱",
    rate: 500,
    offer: { setup: "₱1,000", monthly: "₱500" },
    payoutMethods: ["GCash", "Maya", "Bank transfer"],
    defaultPayoutMethod: "GCash",
  },
  USD: {
    currency: "USD",
    symbol: "$",
    rate: 8,
    offer: { setup: "$16", monthly: "$8" },
    payoutMethods: ["Wise", "UPI", "Bank transfer", "PayPal"],
    defaultPayoutMethod: "Wise",
  },
};

export function currencyConfig(slug: string): CurrencyConfig {
  return CURRENCY_CONFIG[referralCurrency(slug)];
}
