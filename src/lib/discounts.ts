import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { discountedPrice, discountLabel, type AppliedDiscount, type DiscountType } from "@/lib/discount-utils";

// Re-export the pure helpers so server callers can keep importing from "@/lib/discounts".
export { discountedPrice, discountLabel };
export type { AppliedDiscount, DiscountType };

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
