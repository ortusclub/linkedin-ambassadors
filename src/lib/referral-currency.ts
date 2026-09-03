// Per-referrer currency for the referral programme (portal + admin).
//
// The referral system was built PH-only (pesos, GCash/Maya). As we open it to
// non-PH people (India first), each such referrer — AND the ambassadors they refer
// — need their own currency, amounts and payout methods. There is deliberately NO
// DB column for this yet: there are only a handful of USD referrers, so a code list
// is simpler and avoids a schema migration. Add a slug to USD_SLUGS to flip that
// referrer (and everyone they refer) to USD.
//
// Confirmed USD offer (Sam, 2026-09-02): referrer $8 / accepted signup (uncapped);
// the ambassador they refer earns $16 set-up + $8/month.

export type Currency = "PHP" | "USD";

const USD_SLUGS = new Set<string>([
  "aditya-39", // India — first non-PH referrer
]);

export function referralCurrency(slug: string | null | undefined): Currency {
  return USD_SLUGS.has((slug || "").trim().toLowerCase()) ? "USD" : "PHP";
}

// An ambassador's currency follows the referrer who signed them up. `referredBy`
// stores the referrer slug (e.g. "aditya-39"); unknown / no referrer → PHP.
export const currencyForReferredBy = referralCurrency;

export interface CurrencyConfig {
  currency: Currency;
  symbol: string;
  rate: number; // referrer commission per onboarded signup, in this currency
  setupAmount: number; // ambassador one-time set-up fee (numeric)
  monthlyAmount: number; // ambassador monthly (numeric)
  offer: { setup: string; monthly: string }; // formatted for display (portal)
  payoutMethods: string[];
  defaultPayoutMethod: string;
}

// Format a bare number in a currency (whole units, no cents — payouts are whole).
export function formatMoney(amount: number, currency: Currency): string {
  return CURRENCY_CONFIG[currency].symbol + Math.round(amount).toLocaleString("en-US");
}

function make(
  currency: Currency, symbol: string, rate: number, setupAmount: number, monthlyAmount: number,
  payoutMethods: string[], defaultPayoutMethod: string,
): CurrencyConfig {
  return {
    currency, symbol, rate, setupAmount, monthlyAmount,
    offer: {
      setup: symbol + setupAmount.toLocaleString("en-US"),
      monthly: symbol + monthlyAmount.toLocaleString("en-US"),
    },
    payoutMethods, defaultPayoutMethod,
  };
}

export const CURRENCY_CONFIG: Record<Currency, CurrencyConfig> = {
  PHP: make("PHP", "₱", 500, 1000, 500, ["GCash", "Maya", "Bank transfer"], "GCash"),
  USD: make("USD", "$", 8, 16, 8, ["Wise", "UPI", "Bank transfer", "PayPal"], "Wise"),
};

export function currencyConfig(slug: string | null | undefined): CurrencyConfig {
  return CURRENCY_CONFIG[referralCurrency(slug)];
}
