// Pure, dependency-free discount helpers — safe to import in client components
// (the DB-backed lookup/consume live in discount.ts, which imports Prisma).

export type DiscountType = "percent" | "fixed" | "flat" | "tiered";

// A tier in a "price book" (tiered) code: an account matches when its verified flag
// equals `verified` AND its connection count is >= `minConnections`; among matches the
// most specific one (highest minConnections) wins. `price` is the exact $/mo it pays.
export interface TierRule {
  verified: boolean;
  minConnections: number;
  price: number;
}

export interface AppliedDiscount {
  code: string;
  type: DiscountType;
  value: number;
  tiers?: TierRule[];
}

// The attributes a tiered code prices an account by.
export interface PricedAccount {
  linkedinVerified?: boolean;
  connectionCount?: number;
}

// Pick the tier price for one account from a price book. Returns null if nothing matches
// (caller should fall back to the list price so an account is never mispriced to $0).
export function tieredPrice(account: PricedAccount, tiers: TierRule[]): number | null {
  const verified = !!account.linkedinVerified;
  const conns = Number(account.connectionCount ?? 0);
  const matches = (tiers || []).filter(
    (t) => !!t.verified === verified && conns >= Number(t.minConnections ?? 0)
  );
  if (matches.length === 0) return null;
  const best = matches.reduce((a, b) => (Number(b.minConnections) > Number(a.minConnections) ? b : a));
  return Math.max(0, Math.round(Number(best.price) * 100) / 100);
}

// Price a renter pays for one account after a discount.
//   percent -> list * (1 - value/100)
//   fixed   -> list - value          (floored at 0)
//   flat    -> value                 (exact price, ignores list)
//   tiered  -> the matching tier price (needs the account; falls back to list on no match)
export function discountedPrice(listPrice: number, d: AppliedDiscount, account?: PricedAccount): number {
  if (d.type === "tiered") {
    const t = account && d.tiers ? tieredPrice(account, d.tiers) : null;
    return t != null ? t : Math.max(0, Math.round(listPrice * 100) / 100);
  }
  let p: number;
  if (d.type === "percent") p = listPrice * (1 - d.value / 100);
  else if (d.type === "fixed") p = listPrice - d.value;
  else p = d.value; // flat
  return Math.max(0, Math.round(p * 100) / 100);
}

export function discountLabel(d: AppliedDiscount): string {
  if (d.type === "percent") return `${d.value}% off`;
  if (d.type === "fixed") return `$${d.value.toFixed(2)} off`;
  if (d.type === "tiered") return `${d.code} partner pricing`;
  return `$${d.value.toFixed(2)}/mo flat`;
}
