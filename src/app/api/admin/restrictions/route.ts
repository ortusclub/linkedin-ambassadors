import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { computeRestrictionAnalytics } from "@/lib/restriction-analytics";

// Admin: restriction / recovery analytics for /admin/restrictions. Reads the append-only
// restrictionLog on each account (plus onboarding dates from applications) and returns the
// cohort breakdowns. Removed accounts are excluded from every denominator.
export async function GET() {
  try {
    await requireAdmin();

    const [accounts, apps, rentals] = await Promise.all([
      prisma.linkedInAccount.findMany({
        where: { status: { not: "removed" } },
        select: {
          id: true, linkedinName: true, linkedinUrl: true, linkedinVerified: true,
          restrictedAt: true, restrictionLog: true, connectionCount: true,
          accountAgeMonths: true, loginEmail: true, workEmail: true,
          proxyHost: true, proxyLocation: true, status: true, notes: true,
        },
      }),
      prisma.ambassadorApplication.findMany({
        select: { linkedinUrl: true, email: true, status: true, emailPrimaryAt: true, onboardedAt: true, verifiedAt: true, paidAt: true },
      }),
      // All rentals with their renter — gives both the earliest rental start per account
      // (the "Rented" boundary for historical staging) and the set of clients per account
      // (the by-client restriction rate).
      prisma.rental.findMany({
        select: { linkedinAccountId: true, startDate: true, user: { select: { fullName: true, email: true } } },
      }),
    ]);

    const rentalStartById: Record<string, Date> = {};
    const clientsByAccountId: Record<string, string[]> = {};
    for (const r of rentals) {
      const acctId = r.linkedinAccountId;
      if (r.startDate && (!rentalStartById[acctId] || r.startDate < rentalStartById[acctId])) rentalStartById[acctId] = r.startDate;
      const label = (r.user?.fullName || r.user?.email || "").trim();
      if (label) {
        const list = clientsByAccountId[acctId] || (clientsByAccountId[acctId] = []);
        if (!list.includes(label)) list.push(label);
      }
    }

    const analytics = computeRestrictionAnalytics(accounts, apps, rentalStartById, clientsByAccountId);
    return NextResponse.json(analytics);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    const code = msg === "Forbidden" ? 403 : msg === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
