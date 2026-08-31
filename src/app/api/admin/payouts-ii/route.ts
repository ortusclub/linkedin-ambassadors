import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { isCompanyEmail } from "@/lib/company";
import { monthlyDueDate, setupDueDate, SETUP_FEE } from "@/lib/payment-schedule";

// Payouts II data — money we pay OUT to the ambassador who supplies each account,
// per account, regardless of whether the account is currently rented. Payout
// history is stored per OWNER (ambassadorApplication.monthlyPayouts), so each of
// an owner's accounts shares that ledger. Admin-only; returns credentials for the
// expandable inventory-style row, same as /api/admin/accounts.

type PayoutEntry = { paidAt?: string; amount?: number; kind?: string };
type Bucket = "setup" | "overdue" | "due" | "paid" | "na";

const sameMonth = (iso: string, y: number, m: number) => {
  const d = new Date(iso);
  return d.getFullYear() === y && d.getMonth() === m;
};

export async function GET() {
  try {
    await requireAdmin();

    const accounts = await prisma.linkedInAccount.findMany({
      where: { status: { notIn: ["removed"] } },
      orderBy: { linkedinName: "asc" },
      select: {
        id: true, linkedinName: true, linkedinHeadline: true, linkedinUrl: true,
        location: true, connectionCount: true, accountAgeMonths: true,
        loginEmail: true, accountPassword: true, twoFactor: true,
        gologinProfileId: true, gologinShareLink: true,
        status: true, restrictedAt: true, monthlyPrice: true, ambassadorPayment: true,
        notes: true,
      },
    });

    const apps = await prisma.ambassadorApplication.findMany({
      select: {
        email: true, fullName: true, linkedinUrl: true, onboardedAt: true,
        accountFreshness: true, paidAt: true,
        monthlyPayouts: true, paymentMethod: true, paypalEmail: true, wiseEmail: true,
        paymentDetails: true, accountIssue: true, status: true,
      },
    });

    const appByEmail = new Map(apps.map((a) => [a.email.toLowerCase(), a]));
    const emailByUrl = new Map<string, string>();
    for (const a of apps) {
      if (a.linkedinUrl) {
        emailByUrl.set(a.linkedinUrl, a.email);
        emailByUrl.set(a.linkedinUrl.replace(/\/$/, ""), a.email);
      }
    }

    const now = Date.now();
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const cyStart = new Date(); cyStart.setDate(1); cyStart.setHours(0, 0, 0, 0);
    const CY = cyStart.getFullYear(), CM = cyStart.getMonth();

    const rows = accounts.map((a) => {
      // Resolve the external ambassador who owns this account.
      let ownerEmail = (a.notes || "").match(/Owner:\s*(\S+@\S+)/)?.[1]?.replace(/\.$/, "") || "";
      if (!ownerEmail && a.linkedinUrl) ownerEmail = emailByUrl.get(a.linkedinUrl) || emailByUrl.get(a.linkedinUrl.replace(/\/$/, "")) || "";
      const app = ownerEmail ? appByEmail.get(ownerEmail.toLowerCase()) : undefined;
      const ownerName = app?.fullName || ownerEmail || null;
      const method = app?.paymentMethod || (app?.paypalEmail ? `PayPal: ${app.paypalEmail}` : app?.wiseEmail ? `Wise: ${app.wiseEmail}` : null);
      const methodDetail = app?.paymentDetails || null;

      const payouts: PayoutEntry[] = Array.isArray(app?.monthlyPayouts) ? (app!.monthlyPayouts as PayoutEntry[]) : [];
      const monthlyEntries = payouts.filter((p) => p?.kind !== "setup");
      const totalPaid = payouts.reduce((s, p) => s + Number(p?.amount || 0), 0);
      const last = monthlyEntries.reduce<PayoutEntry | null>((best, p) => (!best || (p.paidAt && best.paidAt && new Date(p.paidAt) > new Date(best.paidAt)) ? p : best), null);
      const monthlyAmount = Number(a.ambassadorPayment || 0);
      const onboardedAt = app?.onboardedAt ? new Date(app.onboardedAt).toISOString() : null;
      const paidCount = monthlyEntries.length;
      const nextDue = onboardedAt ? monthlyDueDate(onboardedAt, paidCount) : null;
      const firstDue = onboardedAt ? monthlyDueDate(onboardedAt, 0) : null;

      // One-time ₱1,000 setup fee (per ambassador). Paid if the application's
      // paidAt is set OR a "setup" payout entry was logged.
      const setupPaid = !!app?.paidAt || payouts.some((p) => p?.kind === "setup");
      const setupDue = onboardedAt ? setupDueDate(onboardedAt, app?.accountFreshness || null) : null;

      // Categorise. Bucket meaning:
      //  setup   → one-time ₱1,000 initial payment still outstanding
      //  overdue → a monthly payout is due and unpaid (or on hold)
      //  due     → a monthly payout is coming up, not yet at its due date
      //  paid    → already paid this cycle
      //  na      → nobody to pay (restricted / inaccessible / company / no rate / no start date)
      let bucket: Bucket = "due";
      let reason = "Up to date";
      let overdue = false;
      let dueISO: string | null = nextDue ? new Date(nextDue).toISOString() : null;

      if (a.restrictedAt) { bucket = "na"; reason = "Restricted"; }
      else if (a.status === "retired") { bucket = "na"; reason = "Inaccessible"; }
      else if (!ownerEmail || isCompanyEmail(ownerEmail)) { bucket = "na"; reason = "Company-owned · no ambassador"; }
      else if (!onboardedAt) { bucket = "na"; reason = "No onboarding date"; }
      else if (!setupPaid) {
        // Initial ₱1,000 not yet settled → its own section, regardless of monthly.
        bucket = "setup";
        dueISO = setupDue ? setupDue.toISOString() : null;
        overdue = !!setupDue && setupDue.getTime() < startOfToday.getTime();
        reason = overdue ? "Initial ₱1,000 overdue" : "Initial ₱1,000 due";
      }
      else if (monthlyAmount <= 0) { bucket = "na"; reason = "No monthly rate set"; }
      else if (firstDue && cyStart >= firstDue) {
        const paidThisCycle = monthlyEntries.some((p) => p.paidAt && sameMonth(p.paidAt, CY, CM));
        if (paidThisCycle) { bucket = "paid"; reason = "Paid this cycle"; }
        else if (app?.accountIssue || (!method)) { bucket = "overdue"; reason = app?.accountIssue ? "On hold · login issue" : "On hold · no payment method"; overdue = true; }
        else { bucket = "overdue"; reason = "Payment due"; overdue = true; }
      } else {
        bucket = "due"; reason = "Not due yet";
      }

      const daysLate = overdue && dueISO ? Math.max(0, Math.ceil((now - new Date(dueISO).getTime()) / 86400000)) : 0;

      return {
        id: a.id,
        linkedinName: a.linkedinName,
        linkedinHeadline: a.linkedinHeadline,
        linkedinUrl: a.linkedinUrl,
        location: a.location,
        connectionCount: a.connectionCount,
        accountAgeMonths: a.accountAgeMonths,
        loginEmail: a.loginEmail,
        accountPassword: a.accountPassword,
        twoFactor: a.twoFactor,
        gologinProfileId: a.gologinProfileId,
        gologinShareLink: a.gologinShareLink,
        status: a.status,
        monthlyPrice: a.monthlyPrice,
        bucket,
        reason,
        overdue,
        daysLate,
        ownerName,
        ownerEmail: ownerEmail || null,
        paymentMethod: method,
        paymentDetail: methodDetail,
        monthlyAmount,
        lastPaidAt: last?.paidAt || null,
        lastPaidAmount: last?.amount != null ? Number(last.amount) : null,
        nextDueISO: dueISO,
        setupAmount: SETUP_FEE,
        totalPaid,
      };
    });

    return NextResponse.json({ rows });
  } catch (error) {
    if (error instanceof Error && (error.message === "Forbidden" || error.message === "Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
