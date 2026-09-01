import { prisma } from "@/lib/prisma";
import { isReferralEarned } from "@/lib/referrals";

// Ambassador payout schedule + "who's due to be paid" computation, shared by the
// admin Owners panel and the weekly digest email so both agree exactly.

export const SETUP_FEE = 1000;       // one-time ₱ setup fee
const MARKETER_RATE = 500;           // ₱ per onboarded signup
const DAY = 24 * 60 * 60 * 1000;

// Roll a date forward to the next business day (Mon–Fri) when it lands on a weekend,
// so a payment is never scheduled for a Saturday or Sunday.
export function nextBusinessDay(d: Date): Date {
  const r = new Date(d);
  const day = r.getDay(); // 0 = Sun, 6 = Sat
  if (day === 6) r.setDate(r.getDate() + 2);
  else if (day === 0) r.setDate(r.getDate() + 1);
  return r;
}

// Setup fee is due N days after onboarding: 3 for an established account, 1 week for
// fresh — rolled to the next business day so it always falls on a weekday.
export function setupDueDate(onboardedAt: Date | string | null, freshness: string | null): Date | null {
  if (!onboardedAt) return null;
  const d = new Date(onboardedAt);
  d.setDate(d.getDate() + (freshness === "fresh" ? 7 : 3));
  return nextBusinessDay(d);
}

// The date the setup fee was PAID drives the monthly schedule (not the onboard date).
// Prefer the "setup" payout entry's paidAt; fall back to the legacy paidAt timestamp.
export function setupPaidDate(paidAt: Date | string | null, monthlyPayouts: unknown): Date | null {
  const arr = Array.isArray(monthlyPayouts) ? (monthlyPayouts as Array<{ kind?: string; paidAt?: string }>) : [];
  const s = arr.find((p) => p?.kind === "setup" && p.paidAt);
  if (s?.paidAt) return new Date(s.paidAt);
  return paidAt ? new Date(paidAt) : null;
}

// Monthly ₱500 begins the first FULL month after the setup fee is PAID, on a 15th-of-
// month cutoff (paid 1st–15th → the 1st of next month; paid 16th–end → the 1st of the
// month after), then the 1st of every month, rolled to the next business day. The Nth
// payment (idx, 0-based) advances by a month. Computed in Manila time so the cutoff
// matches the team's wall clock. Returns null until the setup fee is actually paid.
export function monthlyDueDate(setupPaidAt: Date | string | null, idx: number): Date | null {
  if (!setupPaidAt) return null;
  const m = new Date(new Date(setupPaidAt).getTime() + 8 * 3600 * 1000); // shift to Manila wall clock
  const add = m.getUTCDate() <= 15 ? 1 : 2;
  const base = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + add + idx, 1, 12));
  return nextBusinessDay(base);
}

export interface DueItem {
  kind: "setup" | "monthly";
  name: string;
  email: string;
  method: string | null;
  details: string | null;
  amount: number;
  dueDate: string; // ISO
  overdue: boolean;
  blocked: string | null; // login issue reason — due but can't be paid until resolved
}
export interface MarketerDue { name: string; count: number; amount: number; }
export interface MarketerPayment { name: string; amount: number; paidAt: string; }
export interface PaymentsDue {
  setup: DueItem[];        // setup fees due now / overdue (unpaid)
  monthly: DueItem[];      // monthly ₱500 due now / overdue
  upcoming: DueItem[];     // due within the horizon (not yet due)
  marketers: MarketerDue[];// commissions ready to pay (onboarded + verified)
  marketerPayments: MarketerPayment[]; // referral commissions actually paid (drives ✓ Paid rows)
  totalDueNow: number;     // setup + monthly + marketer, due now
  horizonDays: number;
}

export async function computePaymentsDue(horizonDays = 7): Promise<PaymentsDue> {
  const now = Date.now();
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const horizonEnd = now + horizonDays * DAY;

  const apps = await prisma.ambassadorApplication.findMany({
    where: { status: "onboarded" },
    select: {
      fullName: true, email: true, linkedinUrl: true, onboardedAt: true,
      accountFreshness: true, paidAt: true, monthlyPayouts: true,
      paymentMethod: true, paymentDetails: true, referredBy: true, verifiedAt: true,
      status: true, accountIssue: true,
    },
  });

  // Live inventory → which onboarded owners actually have an account, and their ₱/mo.
  const accounts = await prisma.linkedInAccount.findMany({
    where: { status: { notIn: ["removed", "retired", "under_review"] } },
    select: { linkedinUrl: true, ambassadorPayment: true, notes: true, restrictedAt: true },
  });
  const urlToEmail = new Map<string, string>();
  for (const a of apps) {
    if (a.linkedinUrl) { urlToEmail.set(a.linkedinUrl, a.email); urlToEmail.set(a.linkedinUrl.replace(/\/$/, ""), a.email); }
  }
  const monthlyByEmail = new Map<string, number>();
  const hasAccount = new Set<string>();
  // Restricted (on-hold) accounts don't get paid — track held vs total per owner so a
  // fully-held owner drops out of "due" entirely and a partly-held owner's monthly
  // sum only counts their live accounts. Mirrors the Account Owners view.
  const totalByEmail = new Map<string, number>();
  const heldByEmail = new Map<string, number>();
  for (const acc of accounts) {
    let email = (acc.notes || "").match(/Owner:\s*(\S+@\S+)/)?.[1]?.replace(/\.$/, "") || "";
    if (!email && acc.linkedinUrl) email = urlToEmail.get(acc.linkedinUrl) || urlToEmail.get(acc.linkedinUrl.replace(/\/$/, "")) || "";
    if (!email) continue;
    hasAccount.add(email);
    totalByEmail.set(email, (totalByEmail.get(email) || 0) + 1);
    if (acc.restrictedAt) { heldByEmail.set(email, (heldByEmail.get(email) || 0) + 1); continue; }
    monthlyByEmail.set(email, (monthlyByEmail.get(email) || 0) + Number(acc.ambassadorPayment || 0));
  }

  const setup: DueItem[] = [];
  const monthly: DueItem[] = [];
  const upcoming: DueItem[] = [];

  for (const a of apps) {
    if (!hasAccount.has(a.email)) continue; // real owners only (matches Owners page)
    // Every account this owner supplies is restricted → nothing owed while on hold.
    const total = totalByEmail.get(a.email) || 0;
    if (total > 0 && (heldByEmail.get(a.email) || 0) >= total) continue;
    const monthlyAmount = monthlyByEmail.get(a.email) || MARKETER_RATE;
    const base = { name: a.fullName || a.email, email: a.email, method: a.paymentMethod, details: a.paymentDetails, blocked: a.accountIssue || null };

    // Setup fee — only if not yet marked paid
    if (!a.paidAt) {
      const due = setupDueDate(a.onboardedAt, a.accountFreshness);
      if (due) {
        const item: DueItem = { ...base, kind: "setup", amount: SETUP_FEE, dueDate: due.toISOString(), overdue: due < startOfToday };
        if (due.getTime() <= now) setup.push(item);
        else if (due.getTime() <= horizonEnd) upcoming.push(item);
      }
    }

    // Monthly — the next unpaid month. Count only real monthly payouts, never the
    // one-time setup fee (which is stored in the same array with kind "setup"),
    // so the next-due month matches the per-owner card on the Owners page.
    const paidCount = Array.isArray(a.monthlyPayouts)
      ? (a.monthlyPayouts as Array<{ kind?: string }>).filter((p) => p?.kind !== "setup").length
      : 0;
    const nextDue = monthlyDueDate(setupPaidDate(a.paidAt, a.monthlyPayouts), paidCount);
    if (nextDue) {
      const item: DueItem = { ...base, kind: "monthly", amount: monthlyAmount, dueDate: nextDue.toISOString(), overdue: nextDue < startOfToday };
      if (nextDue.getTime() <= now) monthly.push(item);
      else if (nextDue.getTime() <= horizonEnd) upcoming.push(item);
    }
  }

  // Marketer commissions ready to pay — NET of commission already paid, keyed to the
  // referrer's display name (not the slug). Mirrors /admin/referrals so both agree.
  const earnedByRef = new Map<string, number>();
  for (const a of apps) {
    const ref = (a.referredBy || "").trim().toLowerCase();
    if (!ref || !isReferralEarned(a)) continue;
    earnedByRef.set(ref, (earnedByRef.get(ref) || 0) + 1);
  }
  const refSlugs = [...earnedByRef.keys()];
  // Every actually-paid commission payout (any referrer) — drives both the net-owed maths
  // and the "✓ Paid" referral rows on the payouts page.
  const commPayouts = await prisma.payout.findMany({
    where: { type: "commission", paidAt: { not: null } },
    select: { referrerId: true, amount: true, paidAt: true },
  });
  const paidRefIds = [...new Set(commPayouts.map((p) => p.referrerId))];
  const referrers = (refSlugs.length || paidRefIds.length)
    ? await prisma.referrer.findMany({ where: { OR: [{ slug: { in: refSlugs } }, { id: { in: paidRefIds } }] }, select: { id: true, name: true, slug: true } })
    : [];
  const refBySlug = new Map(referrers.map((r) => [r.slug.toLowerCase(), r]));
  const refById = new Map(referrers.map((r) => [r.id, r]));
  const paidByRefId = new Map<string, number>();
  const marketerPayments: MarketerPayment[] = [];
  for (const p of commPayouts) {
    paidByRefId.set(p.referrerId, (paidByRefId.get(p.referrerId) || 0) + Number(p.amount));
    marketerPayments.push({ name: refById.get(p.referrerId)?.name || p.referrerId, amount: Number(p.amount), paidAt: (p.paidAt as Date).toISOString() });
  }
  const marketers: MarketerDue[] = [];
  for (const [slug, earnedCount] of earnedByRef) {
    const r = refBySlug.get(slug);
    const paid = r ? paidByRefId.get(r.id) || 0 : 0;
    const outstanding = Math.max(0, earnedCount * MARKETER_RATE - paid);
    if (outstanding <= 0) continue;
    marketers.push({ name: r?.name || slug, count: Math.round(outstanding / MARKETER_RATE), amount: outstanding });
  }
  marketers.sort((a, b) => b.amount - a.amount);

  const sortByDue = (arr: DueItem[]) => arr.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  sortByDue(setup); sortByDue(monthly); sortByDue(upcoming);

  const totalDueNow =
    setup.reduce((s, i) => s + i.amount, 0) +
    monthly.reduce((s, i) => s + i.amount, 0) +
    marketers.reduce((s, m) => s + m.amount, 0);

  return { setup, monthly, upcoming, marketers, marketerPayments, totalDueNow, horizonDays };
}
