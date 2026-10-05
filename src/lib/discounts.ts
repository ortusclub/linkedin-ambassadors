import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export type DiscountType = "percent" | "fixed" | "flat";

export interface AppliedDiscount {
  code: string;
  type: DiscountType;
  value: number;
}

// Compute the price a renter pays for one account after a discount.
//   percent -> list * (1 - value/100)
//   fixed   -> list - value          (floored at 0)
//   flat    -> value                 (exact price, ignores list)
export function discountedPrice(listPrice: number, d: AppliedDiscount): number {
  let p: number;
  if (d.type === "percent") p = listPrice * (1 - d.value / 100);
  else if (d.type === "fixed") p = listPrice - d.value;
  else p = d.value; // flat
  // Round to cents, never below 0.
  return Math.max(0, Math.round(p * 100) / 100);
}

// Human-readable summary of what a code does (for UI).
export function discountLabel(d: AppliedDiscount): string {
  if (d.type === "percent") return `${d.value}% off`;
  if (d.type === "fixed") return `$${d.value.toFixed(2)} off`;
  return `$${d.value.toFixed(2)}/mo flat`;
}

export interface DiscountLookup {
  ok: boolean;
  error?: string;
  discount?: AppliedDiscount;
}

// Validate a raw code string against the DB: exists, active, not expired, redemptions left.
// Returns the normalized discount or a user-facing error. Does NOT consume a redemption.
export async function lookupDiscount(rawCode: string): Promise<DiscountLookup> {
  const code = (rawCode || "").trim().toUpperCase();
  if (!code) return { ok: false, error: "Enter a code." };

  const row = await prisma.discountCode.findUnique({ where: { code } });
  if (!row || !row.active) return { ok: false, error: "That code isn't valid." };
  if (row.expiresAt && row.expiresAt < new Date()) return { ok: false, error: "That code has expired." };
  if (row.maxRedemptions != null && row.timesRedeemed >= row.maxRedemptions) {
    return { ok: false, error: "That code has reached its usage limit." };
  }
  return {
    ok: true,
    discount: { code: row.code, type: row.type as DiscountType, value: Number(row.value) },
  };
}

// Consume one redemption of a code (call inside the checkout transaction after a rental
// is created). `tx` is an optional Prisma transaction client.
export async function consumeDiscount(code: string, tx?: Prisma.TransactionClient) {
  const client = tx ?? prisma;
  await client.discountCode.updateMany({
    where: { code: code.trim().toUpperCase() },
    data: { timesRedeemed: { increment: 1 } },
  });
}
