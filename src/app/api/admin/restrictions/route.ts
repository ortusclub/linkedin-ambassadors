import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { computeRestrictionAnalytics } from "@/lib/restriction-analytics";

// Canonical renter display names for the by-client restriction breakdown, keyed by the
// renter's email (stable across duplicate user rows). Returns null for renters to leave out
// of the breakdown entirely — internal test accounts and off-platform Telegram handles.
const CLIENT_ALIASES: Record<string, string> = {
  "lydia@profilepartner.net": "ProfilePartner",
  "info@ortus.solutions": "Ortus",
  "info@apexstrategy.io": "Apex",
};
const CLIENT_EXCLUDE = new Set(["samuel.adcock@gmail.com", "sdnuqwdfnuwq@ortus.solutions"]); // Sam Adcock (internal, incl. dup)
function clientLabel(fullName?: string | null, email?: string | null): string | null {
  const mail = (email || "").toLowerCase().trim();
  if (mail.endsWith("@telegram.local")) return null; // off-platform Telegram renters
  if (CLIENT_EXCLUDE.has(mail)) return null;
  if (CLIENT_ALIASES[mail]) return CLIENT_ALIASES[mail];
  return (fullName || email || "").trim() || null;
}

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
      const label = clientLabel(r.user?.fullName, r.user?.email);
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
