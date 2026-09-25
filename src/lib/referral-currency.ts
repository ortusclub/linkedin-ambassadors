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
  "aditya-39",      // India — first non-PH referrer
  "dharmendra-35",  // India
  "hafiz-52",       // overseas referrer — paid in USD
]);

export function referralCurrency(slug: string | null | undefined): Currency {
  return USD_SLUGS.has((slug || "").trim().toLowerCase()) ? "USD" : "PHP";
}

// An ambassador's currency follows the referrer who signed them up. `referredBy`
// stores the referrer slug (e.g. "aditya-39"); unknown / no referrer → PHP.
export const currencyForReferredBy = referralCurrency;

// Tiered referral commission. `referral` = LV onboards them (plain referral).
// The DIY (self-service) tiers pay more, and verified accounts pay the top of each:
//   phone    = referrer chased it but LV did the sign-in (hand-off)
//   computer = referrer did the guided sign-in themselves (highest)
export interface ReferralTiers {
  referral: number;
  phone: { base: number; verified: number };
  computer: { base: number; verified: number };
}

export interface CurrencyConfig {
  currency: Currency;
  symbol: string;
  rate: number; // referrer commission per onboarded signup (= referralTiers.referral), in this currency
  referralTiers: ReferralTiers;
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
  currency: Currency, symbol: string, rate: number, referralTiers: ReferralTiers,
  setupAmount: number, monthlyAmount: number,
  payoutMethods: string[], defaultPayoutMethod: string,
): CurrencyConfig {
  return {
    currency, symbol, rate, referralTiers, setupAmount, monthlyAmount,
    offer: {
      setup: symbol + setupAmount.toLocaleString("en-US"),
      monthly: symbol + monthlyAmount.toLocaleString("en-US"),
    },
    payoutMethods, defaultPayoutMethod,
  };
}

// PHP tiers agreed with Sam. USD mirrors the same shape, scaled to the two anchors
// he set ($8 refer, $16 computer-verified) with the intermediate steps rounded to
// whole dollars and kept in the same order as PHP (600/700/800/1000 → 10/11/13/16).
const PHP_TIERS: ReferralTiers = { referral: 500, phone: { base: 600, verified: 800 }, computer: { base: 700, verified: 1000 } };
const USD_TIERS: ReferralTiers = { referral: 8, phone: { base: 10, verified: 13 }, computer: { base: 11, verified: 16 } };

export const CURRENCY_CONFIG: Record<Currency, CurrencyConfig> = {
  // PH options ordered by how often people actually get paid that way (GCash dominant,
  // then Maribank / GoTyme / Maya, then the banks); Bank transfer stays the catch-all.
  PHP: make("PHP", "₱", 500, PHP_TIERS, 1000, 500, ["GCash", "Maya", "Maribank", "GoTyme", "UnionBank", "BPI", "BDO", "PayPal", "Wise", "Bank transfer"], "GCash"),
  USD: make("USD", "$", 8, USD_TIERS, 16, 8, ["UPI", "PayPal", "Wise", "Bank transfer", "GCash", "Maya"], "Wise"),
};

export function currencyConfig(slug: string | null | undefined): CurrencyConfig {
  return CURRENCY_CONFIG[referralCurrency(slug)];
}

// Resolve an owner's currency. An explicit per-owner override ("PHP" | "USD") wins;
// otherwise it falls back to the referrer's currency. This lets an ambassador be
// pinned to a currency regardless of who referred them.
export function currencyConfigFor(
  explicit: string | null | undefined,
  slug: string | null | undefined,
): CurrencyConfig {
  const ex = (explicit || "").trim().toUpperCase();
  if (ex === "PHP" || ex === "USD") return CURRENCY_CONFIG[ex as Currency];
  return currencyConfig(slug);
}
