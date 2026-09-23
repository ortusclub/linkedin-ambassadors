import { prisma } from "@/lib/prisma";
import { isReferralEarned, isReferralMatured, referralMaturesAt, referralCommissionAmount } from "@/lib/referrals";
import { type Currency, currencyConfig, currencyConfigFor } from "@/lib/referral-currency";

// Ambassador payout schedule + "who's due to be paid" computation, shared by the
// admin Owners panel and the weekly digest email so both agree exactly.
//
// Amounts are per-referrer currency: PH referrers (and the ambassadors they refer)
// stay ₱ (₱1,000 setup / ₱500 monthly / ₱500 commission); non-PH referrers use USD
// — see lib/referral-currency. SETUP_FEE stays the PH default for legacy callers.

export const SETUP_FEE = 1000;       // one-time ₱ setup fee (PH default)
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

// The setup fee clears after the post-onboarding verification window: three days for
// accounts over a year old, seven days for newer accounts. This gives the owner time to
// complete any LinkedIn verification prompted after the shared session is established.
export function setupDueDate(onboardedAt: Date | string | null, freshness?: string | null): Date | null {
  if (!onboardedAt) return null;
  const d = new Date(onboardedAt);
  d.setDate(d.getDate() + (freshness === "fresh" || freshness === "unknown" ? 7 : 3));
  return nextBusinessDay(d);
}

// Warm-up window before we log in: 3 days for an established account, 1 week for fresh,
// anchored on when onboarding started. Drives the "log in due" nudge, not a payment.
export function loginDueDate(onboardingStartedAt: Date | string | null, freshness: string | null): Date | null {
  if (!onboardingStartedAt) return null;
  const d = new Date(onboardingStartedAt);
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
  currency: Currency;
  dueDate: string; // ISO
  overdue: boolean;
  blocked: string | null; // login issue reason — due but can't be paid until resolved
}
export interface ReferralPerson { name: string; url: string | null; dueDate: string; }
export interface MarketerDue { name: string; count: number; dueCount: number; amount: number; currency: Currency; dueDate: string | null; people: ReferralPerson[]; }
export interface MarketerUpcoming { name: string; count: number; amount: number; currency: Currency; dueDate: string; people: ReferralPerson[]; }
export interface MarketerPayment { name: string; amount: number; paidAt: string; }
export interface ReferralDue {
  applicationId: string;
  person: string;          // referred ambassador name
  url: string | null;      // their LinkedIn profile
  referrerName: string;
  referrerId: string | null;
  referrerSlug: string | null;
  amount: number;
  currency: Currency;
  dueDate: string;         // maturation date (past for ready, future for upcoming)
  status: "ready" | "upcoming";
  payVia: string | null;   // referrer's payout method · details
}
export interface PaymentsDue {
  setup: DueItem[];        // setup fees due now / overdue (unpaid)
  monthly: DueItem[];      // monthly due now / overdue
  upcoming: DueItem[];     // due within the horizon (not yet due)
  marketers: MarketerDue[];// commissions ready to pay (onboarded + verified + matured)
  marketersUpcoming: MarketerUpcoming[]; // earned but still maturing (Level 4→5) — due later
  referralsDue: ReferralDue[]; // per-person referral commissions still owed (ready + upcoming)
  marketerPayments: MarketerPayment[]; // referral commissions actually paid (drives ✓ Paid rows)
  totalDueNow: number;     // setup + monthly + marketer, due now (PH ₱ only — legacy)
  totalsByCurrency: Record<Currency, number>; // due-now totals split by currency
  horizonDays: number;
}

export async function computePaymentsDue(horizonDays = 7): Promise<PaymentsDue> {
  const now = Date.now();
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const horizonEnd = now + horizonDays * DAY;

  const apps = await prisma.ambassadorApplication.findMany({
    where: { status: "onboarded" },
    select: {
      id: true, fullName: true, email: true, linkedinUrl: true, onboardedAt: true,
      accountFreshness: true, paidAt: true, monthlyPayouts: true,
      paymentMethod: true, paymentDetails: true, referredBy: true, referralSource: true, payoutCurrency: true, verifiedAt: true,
      status: true, accountIssue: true, onboardingMethod: true, onboardingVerified: true,
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
    // Currency: a per-owner override wins, else it follows the referrer who signed
    // this ambassador up (PH → ₱, else USD).
    const cfg = currencyConfigFor(a.payoutCurrency, a.referredBy);
    const monthlyAmount = monthlyByEmail.get(a.email) || cfg.monthlyAmount;
    const base = { name: a.fullName || a.email, email: a.email, method: a.paymentMethod, details: a.paymentDetails, currency: cfg.currency, blocked: a.accountIssue || null };

    // Setup fee — only if not yet marked paid
    if (!a.paidAt) {
      const due = setupDueDate(a.onboardedAt, a.accountFreshness);
      if (due) {
        const item: DueItem = { ...base, kind: "setup", amount: cfg.setupAmount, dueDate: due.toISOString(), overdue: due < startOfToday };
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
  // A referral is fully READY once its account has matured (passed its check window after
  // QC / verifiedAt — 3 days established / 1 week new) or is onboarded; while still maturing
  // it's UPCOMING, with a due date = maturation completion.
  type MatGate = { status: string; verifiedAt: Date | string | null; accountFreshness: string | null };
  const isMatured = (a: MatGate) => isReferralMatured(a);
  type RefPerson = { name: string; url: string | null; dueDate: string };
  // Commission payouts. An ATTRIBUTED payout (ambassadorApplicationId) marks one specific
  // referral paid; legacy lump payouts (no appId) are still netted by amount, oldest first.
  const commPayouts = await prisma.payout.findMany({
    where: { type: "commission", paidAt: { not: null } },
    select: { referrerId: true, amount: true, paidAt: true, ambassadorApplicationId: true },
  });
  const paidAppIds = new Set(commPayouts.map((p) => p.ambassadorApplicationId).filter(Boolean) as string[]);
  const legacyPaidByRefId = new Map<string, number>();
  for (const p of commPayouts) if (!p.ambassadorApplicationId) legacyPaidByRefId.set(p.referrerId, (legacyPaidByRefId.get(p.referrerId) || 0) + Number(p.amount));

  const earnedByRefSlug = new Map<string, typeof apps>();
  for (const a of apps) {
    const ref = (a.referredBy || "").trim().toLowerCase();
    if (!ref || !isReferralEarned(a)) continue;
    const arr = earnedByRefSlug.get(ref) || [];
    arr.push(a);
    earnedByRefSlug.set(ref, arr);
  }
  const refSlugs = [...earnedByRefSlug.keys()];
  const paidRefIds = [...new Set(commPayouts.map((p) => p.referrerId))];
  const referrers = (refSlugs.length || paidRefIds.length)
    ? await prisma.referrer.findMany({ where: { OR: [{ slug: { in: refSlugs } }, { id: { in: paidRefIds } }] }, select: { id: true, name: true, slug: true, paymentMethod: true, paymentDetails: true } })
    : [];
  const refBySlug = new Map(referrers.map((r) => [r.slug.toLowerCase(), r]));
  const refById = new Map(referrers.map((r) => [r.id, r]));
  const marketerPayments: MarketerPayment[] = commPayouts.map((p) => ({ name: refById.get(p.referrerId)?.name || p.referrerId, amount: Number(p.amount), paidAt: (p.paidAt as Date).toISOString() }));

  // Per-person referral dues — one row per still-owed referral, tied to its applicationId.
  const referralsDue: ReferralDue[] = [];
  for (const [slug, list] of earnedByRefSlug) {
    const r = refBySlug.get(slug);
    const cfg = currencyConfig(r?.slug || slug);
    const payVia = r?.paymentDetails ? `${r.paymentMethod || "—"} · ${r.paymentDetails}` : null;
    let legacyRemaining = r ? legacyPaidByRefId.get(r.id) || 0 : 0;
    const sorted = [...list].sort((a, b) => (a.verifiedAt ? new Date(a.verifiedAt).getTime() : 0) - (b.verifiedAt ? new Date(b.verifiedAt).getTime() : 0));
    for (const a of sorted) {
      const amt = referralCommissionAmount(a, cfg.referralTiers);
      if (paidAppIds.has(a.id)) continue;                          // explicitly paid to this person
      if (legacyRemaining >= amt - 0.001) { legacyRemaining -= amt; continue; } // covered by a legacy lump payout
      const matured = isMatured(a);
      const dueMs = referralMaturesAt(a)?.getTime() ?? Date.now(); // null → already matured/onboarded → due now
      referralsDue.push({
        applicationId: a.id, person: a.fullName, url: a.linkedinUrl,
        referrerName: r?.name || slug, referrerId: r?.id || null, referrerSlug: r?.slug || null,
        amount: amt, currency: cfg.currency, dueDate: new Date(dueMs).toISOString(),
        status: matured ? "ready" : "upcoming", payVia,
      });
    }
  }
  referralsDue.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  // Aggregate per referrer (backward-compat for the digest) from the per-person dues.
  const aggReady = new Map<string, MarketerDue>();
  const aggUp = new Map<string, MarketerUpcoming>();
  for (const it of referralsDue) {
    const person: RefPerson = { name: it.person, url: it.url, dueDate: it.dueDate };
    if (it.status === "ready") {
      const cur = aggReady.get(it.referrerName) || { name: it.referrerName, count: 0, dueCount: 0, amount: 0, currency: it.currency, dueDate: it.dueDate as string | null, people: [] as RefPerson[] };
      cur.count++; cur.dueCount++; cur.amount += it.amount; cur.people.push(person);
      if (!cur.dueDate || it.dueDate < cur.dueDate) cur.dueDate = it.dueDate;
      aggReady.set(it.referrerName, cur);
    } else {
      const cur = aggUp.get(it.referrerName) || { name: it.referrerName, count: 0, amount: 0, currency: it.currency, dueDate: it.dueDate, people: [] as RefPerson[] };
      cur.count++; cur.amount += it.amount; cur.people.push(person);
      if (it.dueDate < cur.dueDate) cur.dueDate = it.dueDate;
      aggUp.set(it.referrerName, cur);
    }
  }
  const marketers = [...aggReady.values()].sort((a, b) => b.amount - a.amount);
  const marketersUpcoming = [...aggUp.values()].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const sortByDue = (arr: DueItem[]) => arr.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  sortByDue(setup); sortByDue(monthly); sortByDue(upcoming);

  // Totals split by currency — ₱ and $ can't be summed into one figure.
  const totalsByCurrency: Record<Currency, number> = { PHP: 0, USD: 0 };
  for (const i of setup) totalsByCurrency[i.currency] += i.amount;
  for (const i of monthly) totalsByCurrency[i.currency] += i.amount;
  for (const m of marketers) totalsByCurrency[m.currency] += m.amount;

  return { setup, monthly, upcoming, marketers, marketersUpcoming, referralsDue, marketerPayments, totalDueNow: totalsByCurrency.PHP, totalsByCurrency, horizonDays };
}
