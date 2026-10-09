import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/auth";
import { monthlyRentalPrice } from "@/lib/account-pricing";
import { isShadowRenterEmail } from "@/lib/shadow-rental";
import { grantRentalAccess } from "@/lib/rental-access";
import { REPLACEMENT_HOLD_MS } from "@/lib/replacement";

type RestrictionEvent = { at?: string; event?: string; note?: string; creditedDays?: number };
type AcctPricing = { connectionCount: number; accountAgeMonths: number | null; hasSalesNav: boolean; linkedinVerified: boolean };

const LIVE = ["active", "pending_access", "payment_failed"] as const;
const RECOVERED_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

// Which workqueue tab a status belongs to.
const TAB: Record<string, "needs" | "progress" | "closed"> = {
  waiting: "needs", handover: "needs", origBack: "needs",
  recovering: "progress", failed: "progress",
  recovered: "closed", done: "closed", relisted: "closed", retired: "closed",
};

function lastRestrictedAt(log: unknown): string | null {
  const arr = Array.isArray(log) ? (log as RestrictionEvent[]) : [];
  const r = [...arr].reverse().find((e) => e?.event === "restricted");
  return r?.at ?? null;
}
function lastRecovered(log: unknown): RestrictionEvent | null {
  const arr = Array.isArray(log) ? (log as RestrictionEvent[]) : [];
  return [...arr].reverse().find((e) => e?.event === "recovered") ?? null;
}
const priceOf = (locked: Prisma.Decimal | null, acct: AcctPricing) => Number(locked ?? monthlyRentalPrice(acct));

// Admin Replacements workqueue: every restricted rental, from recovery to swap, with a
// next-step action per row. Three sources: open restrictions, swaps, and recovered-no-swap.
export async function GET() {
  try {
    await requireAdmin();

    const acctSelect = { id: true, linkedinName: true, linkedinUrl: true, restrictedAt: true, twoFactorResetNeeded: true, restrictionLog: true, connectionCount: true, accountAgeMonths: true, hasSalesNav: true, linkedinVerified: true } as const;
    const userSelect = { id: true, fullName: true, email: true, isShadowRenter: true } as const;
    const internalOf = (u: { email: string; isShadowRenter: boolean }, isShadow: boolean) => isShadow || u.isShadowRenter || isShadowRenterEmail(u.email);
    const renterOf = (u: { fullName: string; email: string }, internal: boolean) => ({ name: u.fullName || u.email, email: u.email, internal });

    type Case = Record<string, unknown> & { status: string };
    const cases: Case[] = [];

    // 1) OPEN restrictions — live, non-replaced rentals on a currently-restricted account.
    const open = await prisma.rental.findMany({
      where: { status: { in: [...LIVE] }, linkedinAccount: { is: { restrictedAt: { not: null } } } },
      include: { user: { select: userSelect }, linkedinAccount: { select: acctSelect } },
    });
    for (const r of open) {
      const a = r.linkedinAccount;
      const hrs = a.restrictedAt ? (Date.now() - new Date(a.restrictedAt).getTime()) / 3600000 : 0;
      const status = r.waitingForRecovery ? "waiting" : hrs >= REPLACEMENT_HOLD_MS / 3600000 ? "failed" : "recovering";
      const internal = internalOf(r.user, r.isShadow);
      cases.push({
        id: `open-${r.id}`, status, tab: TAB[status],
        original: { name: a.linkedinName, url: a.linkedinUrl, restrictedAt: a.restrictedAt, price: priceOf(r.lockedPrice, a) },
        replacement: null,
        renter: renterOf(r.user, internal),
        hoursRestricted: Math.round(hrs),
        restrictedAccountId: a.id,
      });
    }

    // 2) SWAPS — NEW rentals that replaced a restricted one.
    const swaps = await prisma.rental.findMany({
      where: { replacesRentalId: { not: null } },
      include: {
        user: { select: userSelect },
        linkedinAccount: { select: acctSelect },
        replaces: { select: { id: true, lockedPrice: true, linkedinAccount: { select: acctSelect } } },
      },
      orderBy: { createdAt: "desc" },
    });
    for (const r of swaps) {
      const oldA = r.replaces?.linkedinAccount;
      const newA = r.linkedinAccount;
      const internal = internalOf(r.user, r.isShadow);
      let status: string;
      if (r.status === "pending_access") status = "handover";
      else if (r.status === "active") {
        if (oldA && !oldA.restrictedAt && oldA.twoFactorResetNeeded) status = "origBack";
        else if (oldA && !oldA.restrictedAt && !oldA.twoFactorResetNeeded) status = "relisted";
        else status = "done";
      } else status = "done"; // cancelled/expired replacement
      const oldPrice = oldA ? priceOf(r.replaces?.lockedPrice ?? null, oldA) : 0;
      const newPrice = priceOf(r.lockedPrice, newA);
      cases.push({
        id: `swap-${r.id}`, status, tab: TAB[status],
        original: oldA ? { name: oldA.linkedinName, url: oldA.linkedinUrl, restrictedAt: lastRestrictedAt(oldA.restrictionLog) ?? oldA.restrictedAt, price: oldPrice } : null,
        replacement: { name: newA.linkedinName, url: newA.linkedinUrl, price: newPrice, diff: newPrice - oldPrice },
        renter: renterOf(r.user, internal),
        swappedAt: r.createdAt,
        newRentalId: r.id,
        relistAccountId: oldA?.id ?? null,
      });
    }

    // 3) RECOVERED (no swap) — live rentals whose account recovered recently and was never replaced.
    const recovered = await prisma.rental.findMany({
      where: { status: { in: [...LIVE] }, replacedBy: { none: {} }, linkedinAccount: { is: { restrictedAt: null, restrictionLog: { not: Prisma.DbNull } } } },
      include: { user: { select: userSelect }, linkedinAccount: { select: acctSelect } },
    });
    for (const r of recovered) {
      const a = r.linkedinAccount;
      const rec = lastRecovered(a.restrictionLog);
      if (!rec?.at || Date.now() - new Date(rec.at).getTime() > RECOVERED_WINDOW_MS) continue;
      const internal = internalOf(r.user, r.isShadow);
      cases.push({
        id: `rec-${r.id}`, status: "recovered", tab: "closed",
        original: { name: a.linkedinName, url: a.linkedinUrl, restrictedAt: lastRestrictedAt(a.restrictionLog), price: priceOf(r.lockedPrice, a) },
        replacement: null,
        renter: renterOf(r.user, internal),
        recoveredAt: rec.at, creditedDays: typeof rec.creditedDays === "number" ? rec.creditedDays : 0,
      });
    }

    return NextResponse.json({ cases });
  } catch (error) {
    if (error instanceof Error && (error.message === "Forbidden" || error.message === "Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: error.message === "Forbidden" ? 403 : 401 });
    }
    console.error("admin replacements error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Workqueue actions.
export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { action, rentalId, accountId } = await req.json();

    if (action === "grant") {
      if (!rentalId) return NextResponse.json({ error: "Missing rentalId" }, { status: 400 });
      await grantRentalAccess(rentalId); // flips pending_access -> active; safe to retry
      return NextResponse.json({ ok: true });
    }
    if (action === "relist") {
      if (!accountId) return NextResponse.json({ error: "Missing accountId" }, { status: 400 });
      await prisma.linkedInAccount.update({ where: { id: accountId }, data: { twoFactorResetNeeded: false, status: "available", listed: true } });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    if (error instanceof Error && (error.message === "Forbidden" || error.message === "Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: error.message === "Forbidden" ? 403 : 401 });
    }
    console.error("admin replacements action error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}
