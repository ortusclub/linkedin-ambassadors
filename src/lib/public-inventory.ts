import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { activeShadowAccountIds } from "@/lib/shadow-rental";

// Hard cap on how much of the roster is ever exposed publicly (catalogue, /api/accounts,
// sitemap) — to anonymous visitors AND signed-in renters alike. Limits the blast radius
// if a bad actor scrapes the site: they only ever learn about this fixed slice, never
// the whole inventory. Everything else is "get in touch for the full list".
//
// The slice is deterministic (top-N by connections, id as tiebreak) so search / filter
// params can't be used to page through the rest of the roster — filters only narrow
// WITHIN this slice.
export const PUBLIC_AVAILABLE_CAP = 20;
export const PUBLIC_RENTED_CAP = 20;

// Public rentable "available" definition — mirrors the admin canonicalStatus: must be
// listed, not restricted, and not awaiting a 2FA reset. Segregated pools never show.
export const PUBLIC_AVAILABLE_WHERE: Prisma.LinkedInAccountWhereInput = {
  inventoryPool: { notIn: ["ortus", "apex"] },
  status: "available",
  listed: true,
  restrictedAt: null,
  twoFactorResetNeeded: false,
};

export type PublicSlice = { availableIds: string[]; rentedIds: string[]; shadowIds: Set<string> };

/**
 * The fixed public slice of the inventory. `rentedIds` covers rented + trial accounts
 * plus shadow-held ("available soon") teasers, as one capped group.
 */
export async function publicInventorySlice(): Promise<PublicSlice> {
  const shadowIds = await activeShadowAccountIds();
  const order = [{ connectionCount: "desc" as const }, { id: "asc" as const }];
  const [avail, rented] = await Promise.all([
    prisma.linkedInAccount.findMany({
      where: { ...PUBLIC_AVAILABLE_WHERE, id: { notIn: [...shadowIds] } },
      orderBy: order,
      take: PUBLIC_AVAILABLE_CAP,
      select: { id: true },
    }),
    prisma.linkedInAccount.findMany({
      where: {
        inventoryPool: { notIn: ["ortus", "apex"] },
        OR: [{ status: { in: ["rented", "trial"] } }, { id: { in: [...shadowIds] } }],
      },
      orderBy: order,
      take: PUBLIC_RENTED_CAP,
      select: { id: true },
    }),
  ]);
  return { availableIds: avail.map((a) => a.id), rentedIds: rented.map((a) => a.id), shadowIds };
}
