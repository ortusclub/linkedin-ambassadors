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
export const PUBLIC_TOTAL_CAP = 20;

// Password that unlocks the FULL roster on the catalogue / API. Set via the
// FULL_LIST_PASSWORD env var on Vercel (never in code). Unset = feature off. Works via
// the "Show full roster" box on /catalogue or a link: /catalogue?key=<password>.
export const hasFullListAccess = (key: string | null | undefined) => {
  const pw = process.env.FULL_LIST_PASSWORD;
  return !!pw && !!key && key === pw;
};

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
 * The fixed public slice of the inventory: at most PUBLIC_TOTAL_CAP accounts in total.
 * Rentable "available" accounts fill the slice first; any remaining room is filled with
 * rented / trial / shadow-held ("available soon") accounts as social proof.
 */
export async function publicInventorySlice(): Promise<PublicSlice> {
  const shadowIds = await activeShadowAccountIds();
  const order = [{ connectionCount: "desc" as const }, { id: "asc" as const }];
  const [avail, rented] = await Promise.all([
    prisma.linkedInAccount.findMany({
      where: { ...PUBLIC_AVAILABLE_WHERE, id: { notIn: [...shadowIds] } },
      orderBy: order,
      take: PUBLIC_TOTAL_CAP,
      select: { id: true },
    }),
    prisma.linkedInAccount.findMany({
      where: {
        inventoryPool: { notIn: ["ortus", "apex"] },
        OR: [{ status: { in: ["rented", "trial"] } }, { id: { in: [...shadowIds] } }],
      },
      orderBy: order,
      take: PUBLIC_TOTAL_CAP,
      select: { id: true },
    }),
  ]);
  const availableIds = avail.map((a) => a.id);
  const rentedIds = rented.map((a) => a.id).slice(0, Math.max(0, PUBLIC_TOTAL_CAP - availableIds.length));
  return { availableIds, rentedIds, shadowIds };
}
