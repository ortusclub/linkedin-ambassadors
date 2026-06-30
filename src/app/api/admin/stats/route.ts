import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { isCompanyEmail } from "@/lib/company";

// A real (sellable) inventory account: not a showcase/dummy, not a leftover test account.
function isRealAccount(a: { notes: string | null; linkedinName: string }) {
  return !(a.notes || "").includes("[SHOWCASE]") && !a.linkedinName.toUpperCase().includes("(TEST)");
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    // Live by default: hide test customers + their rentals from the headline numbers.
    // Pass ?includeTest=1 to show everything.
    const includeTest = req.nextUrl.searchParams.get("includeTest") === "1";
    const liveUser = includeTest ? {} : { isTest: false };
    const liveRental = includeTest ? {} : { user: { isTest: false } };
    const now = new Date();
    const in30d = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Selected month (for the period filter) + previous month (for trend %).
    const monthParam = req.nextUrl.searchParams.get("month");
    const ref = monthParam && /^\d{4}-\d{2}$/.test(monthParam)
      ? new Date(Number(monthParam.slice(0, 4)), Number(monthParam.slice(5, 7)) - 1, 1)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const mStart = new Date(ref.getFullYear(), ref.getMonth(), 1);
    const mEnd = new Date(ref.getFullYear(), ref.getMonth() + 1, 1);
    const pStart = new Date(ref.getFullYear(), ref.getMonth() - 1, 1);
    const monthKey = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}`;

    const [
      inventoryAccounts,
      totalCustomers,
      newCustomers30d,
      activeRentalsList,
      renewalsDue30d,
      atRisk,
      appsToReview,
      recentSignups,
      recentSubmissions,
      vettingStarted,
      vettingDropped,
      revAgg,
      revPrevAgg,
      newCustMonth,
      newCustPrev,
      newRentMonth,
      newRentPrev,
    ] = await Promise.all([
      // Real inventory — exclude removed/retired; showcase + test filtered in JS.
      prisma.linkedInAccount.findMany({
        where: { status: { notIn: ["removed", "retired"] } },
        select: { status: true, notes: true, linkedinName: true, restrictedAt: true },
      }),
      // Customers who have actually rented (a signup with zero rentals isn't a customer yet).
      prisma.user.count({ where: { role: "customer", status: "active", ...liveUser, rentals: { some: {} } } }),
      prisma.user.count({ where: { role: "customer", status: "active", ...liveUser, rentals: { some: { createdAt: { gte: last30d } } } } }),
      prisma.rental.findMany({
        where: { status: "active", ...liveRental },
        include: {
          user: { select: { fullName: true, email: true, isTest: true } },
          linkedinAccount: { select: { linkedinName: true, monthlyPrice: true, ambassadorPayment: true, notes: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.rental.count({ where: { status: "active", ...liveRental, currentPeriodEnd: { gte: now, lte: in30d } } }),
      prisma.rental.count({ where: { ...liveRental, OR: [{ status: "payment_failed" }, { status: "active", autoRenew: false }] } }),
      prisma.ambassadorApplication.count({ where: { status: { in: ["reviewing", "pending"] } } }),
      prisma.user.findMany({ where: { role: "customer", ...liveUser }, select: { fullName: true, email: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 5 }),
      prisma.ambassadorApplication.findMany({ select: { fullName: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 5 }),
      // Vetting funnel: how many opened the form, and how many opened but didn't finish.
      prisma.user.count({ where: { vettingStartedAt: { not: null } } }),
      prisma.user.count({ where: { vettingStartedAt: { not: null }, vettedAt: null } }),
      // Per-month figures (real, from dated records) — for the period filter + trend %.
      prisma.transaction.aggregate({ _sum: { amount: true }, where: { type: "rental_payment", createdAt: { gte: mStart, lt: mEnd } } }),
      prisma.transaction.aggregate({ _sum: { amount: true }, where: { type: "rental_payment", createdAt: { gte: pStart, lt: mStart } } }),
      prisma.user.count({ where: { role: "customer", ...liveUser, createdAt: { gte: mStart, lt: mEnd } } }),
      prisma.user.count({ where: { role: "customer", ...liveUser, createdAt: { gte: pStart, lt: mStart } } }),
      prisma.rental.count({ where: { ...liveRental, createdAt: { gte: mStart, lt: mEnd } } }),
      prisma.rental.count({ where: { ...liveRental, createdAt: { gte: pStart, lt: mStart } } }),
    ]);

    const realAccounts = inventoryAccounts.filter(isRealAccount);
    const totalAccounts = realAccounts.length;
    const availableAccounts = realAccounts.filter((a) => a.status === "available").length;
    const offlineAccounts = realAccounts.filter((a) => a.status === "unavailable" || a.status === "maintenance").length;
    const restrictedAccounts = realAccounts.filter((a) => a.restrictedAt).length;

    const activeRentals = activeRentalsList.length;
    const rentedAccounts = activeRentals; // a test-held account doesn't inflate this
    const mrr = activeRentalsList.reduce((s, r) => s + Number(r.lockedPrice ?? r.linkedinAccount.monthlyPrice ?? 0), 0);
    // Only REAL (external) ambassadors get paid — company/Ortus-owned accounts don't.
    // The account's owner is its profile email (in notes); internal domains = company-owned.
    const profileEmailOf = (notes: string | null) =>
      (notes || "").match(/Profile email:\s*(\S+@\S+\.\S+)/i)?.[1]?.replace(/[.\s]+$/, "") || null;
    const payouts = activeRentalsList.reduce((s, r) => {
      const email = profileEmailOf(r.linkedinAccount.notes);
      const isExternalAmbassador = email ? !isCompanyEmail(email) : false;
      return s + (isExternalAmbassador ? Number(r.linkedinAccount.ambassadorPayment ?? 0) : 0);
    }, 0);
    const netProfit = mrr - payouts;
    const utilization = totalAccounts > 0 ? Math.round((rentedAccounts / totalAccounts) * 100) : 0;

    // Per-month revenue collected (rental_payment debits are negative -> abs) + trends.
    // trend = % change vs previous month; null when there was no prior baseline (i.e. "new").
    const revenue = Math.abs(Number(revAgg._sum.amount ?? 0));
    const revenuePrev = Math.abs(Number(revPrevAgg._sum.amount ?? 0));
    const pct = (cur: number, prev: number): number | null => prev > 0 ? Math.round(((cur - prev) / prev) * 100) : (cur > 0 ? null : 0);
    const revenueTrend = pct(revenue, revenuePrev);
    const newThisMonthTrend = pct(newCustMonth, newCustPrev);
    const newRentalsTrend = pct(newRentMonth, newRentPrev);

    // Merge into one activity feed, newest first.
    const recentActivity = [
      ...realAccounts.filter((a) => a.restrictedAt).map((a) => ({ type: "restricted" as const, label: `Restricted — ${a.linkedinName}`, date: a.restrictedAt as Date, isTest: false })),
      ...activeRentalsList.map((r) => ({ type: "rental" as const, label: `${r.user.fullName} → ${r.linkedinAccount.linkedinName}`, date: r.createdAt, isTest: r.user.isTest })),
      ...recentSignups.map((u) => ({ type: "signup" as const, label: `New signup — ${u.fullName}`, date: u.createdAt, isTest: false })),
      ...recentSubmissions.map((s) => ({ type: "submission" as const, label: `Ambassador application — ${s.fullName}`, date: s.createdAt, isTest: false })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);

    return NextResponse.json({
      stats: {
        // money
        netProfit, mrr, payouts, activeRentals,
        // demand
        totalCustomers, newCustomers30d, renewalsDue30d, atRisk,
        // supply
        totalAccounts, availableAccounts, rentedAccounts, offlineAccounts, restrictedAccounts, utilization, appsToReview,
        // vetting funnel
        vettingStarted, vettingDropped,
        // selected-month figures + trends (real, from dated records)
        month: monthKey, revenue, revenueTrend,
        newThisMonth: newCustMonth, newThisMonthTrend,
        newRentals: newRentMonth, newRentalsTrend,
      },
      recentActivity,
    });
  } catch (error) {
    if (error instanceof Error && (error.message === "Forbidden" || error.message === "Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: error.message === "Forbidden" ? 403 : 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
