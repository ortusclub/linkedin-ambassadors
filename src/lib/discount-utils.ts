// Pure, dependency-free discount helpers — safe to import in client components
// (the DB-backed lookup/consume live in discount.ts, which imports Prisma).

export type DiscountType = "percent" | "fixed" | "flat";

export interface AppliedDiscount {
  code: string;
  type: DiscountType;
  value: number;
}

// Price a renter pays for one account after a discount.
//   percent -> list * (1 - value/100)
//   fixed   -> list - value          (floored at 0)
//   flat    -> value                 (exact price, ignores list)
export function discountedPrice(listPrice: number, d: AppliedDiscount): number {
  let p: number;
  if (d.type === "percent") p = listPrice * (1 - d.value / 100);
  else if (d.type === "fixed") p = listPrice - d.value;
  else p = d.value; // flat
  return Math.max(0, Math.round(p * 100) / 100);
}

export function discountLabel(d: AppliedDiscount): string {
  if (d.type === "percent") return `${d.value}% off`;
  if (d.type === "fixed") return `$${d.value.toFixed(2)} off`;
  return `$${d.value.toFixed(2)}/mo flat`;
}
