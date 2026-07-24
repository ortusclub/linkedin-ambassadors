import { prisma } from "@/lib/prisma";

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

// Monthly ₱500 is paid on the 1st, after one full month of service. The Nth
// payment (idx, 0-based) advances by a month from the first.
export function monthlyDueDate(onboardedAt: Date | string | null, idx: number): Date | null {
  if (!onboardedAt) return null;
  const o = new Date(onboardedAt);
  const anchor = new Date(o.getFullYear(), o.getMonth() + 1, o.getDate());
  const firstMonth = anchor.getDate() === 1 ? anchor.getMonth() : anchor.getMonth() + 1;
  return new Date(anchor.getFullYear(), firstMonth + idx, 1);
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
}
export interface MarketerDue { name: string; count: number; amount: number; }
export interface PaymentsDue {
  setup: DueItem[];        // setup fees due now / overdue (unpaid)
  monthly: DueItem[];      // monthly ₱500 due now / overdue
  upcoming: DueItem[];     // due within the horizon (not yet due)
  marketers: MarketerDue[];// commissions ready to pay (onboarded + verified)
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
    },
  });

  // Live inventory → which onboarded owners actually have an account, and their ₱/mo.
  const accounts = await prisma.linkedInAccount.findMany({
    where: { status: { notIn: ["removed", "retired", "under_review"] } },
    select: { linkedinUrl: true, ambassadorPayment: true, notes: true },
  });
  const urlToEmail = new Map<string, string>();
  for (const a of apps) {
    if (a.linkedinUrl) { urlToEmail.set(a.linkedinUrl, a.email); urlToEmail.set(a.linkedinUrl.replace(/\/$/, ""), a.email); }
  }
  const monthlyByEmail = new Map<string, number>();
  const hasAccount = new Set<string>();
  for (const acc of accounts) {
    let email = (acc.notes || "").match(/Owner:\s*(\S+@\S+)/)?.[1]?.replace(/\.$/, "") || "";
    if (!email && acc.linkedinUrl) email = urlToEmail.get(acc.linkedinUrl) || urlToEmail.get(acc.linkedinUrl.replace(/\/$/, "")) || "";
    if (!email) continue;
    hasAccount.add(email);
    monthlyByEmail.set(email, (monthlyByEmail.get(email) || 0) + Number(acc.ambassadorPayment || 0));
  }

  const setup: DueItem[] = [];
  const monthly: DueItem[] = [];
  const upcoming: DueItem[] = [];

  for (const a of apps) {
    if (!hasAccount.has(a.email)) continue; // real owners only (matches Owners page)
    const monthlyAmount = monthlyByEmail.get(a.email) || MARKETER_RATE;
    const base = { name: a.fullName || a.email, email: a.email, method: a.paymentMethod, details: a.paymentDetails };

    // Setup fee — only if not yet marked paid
    if (!a.paidAt) {
      const due = setupDueDate(a.onboardedAt, a.accountFreshness);
      if (due) {
        const item: DueItem = { ...base, kind: "setup", amount: SETUP_FEE, dueDate: due.toISOString(), overdue: due < startOfToday };
        if (due.getTime() <= now) setup.push(item);
        else if (due.getTime() <= horizonEnd) upcoming.push(item);
      }
    }

    // Monthly — the next unpaid month
    const paidCount = Array.isArray(a.monthlyPayouts) ? a.monthlyPayouts.length : 0;
    const nextDue = monthlyDueDate(a.onboardedAt, paidCount);
    if (nextDue) {
      const item: DueItem = { ...base, kind: "monthly", amount: monthlyAmount, dueDate: nextDue.toISOString(), overdue: nextDue < startOfToday };
      if (nextDue.getTime() <= now) monthly.push(item);
      else if (nextDue.getTime() <= horizonEnd) upcoming.push(item);
    }
  }

  // Marketer commissions ready to pay: onboarded signups whose stability hold cleared.
  const marketerMap = new Map<string, number>();
  for (const a of apps) {
    const ref = (a.referredBy || "").trim();
    if (!ref || !a.verifiedAt) continue; // onboarded (query) + verified = ready
    marketerMap.set(ref, (marketerMap.get(ref) || 0) + 1);
  }
  const marketers: MarketerDue[] = [...marketerMap.entries()]
    .map(([name, count]) => ({ name, count, amount: count * MARKETER_RATE }))
    .sort((a, b) => b.amount - a.amount);

  const sortByDue = (arr: DueItem[]) => arr.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  sortByDue(setup); sortByDue(monthly); sortByDue(upcoming);

  const totalDueNow =
    setup.reduce((s, i) => s + i.amount, 0) +
    monthly.reduce((s, i) => s + i.amount, 0) +
    marketers.reduce((s, m) => s + m.amount, 0);

  return { setup, monthly, upcoming, marketers, totalDueNow, horizonDays };
}
