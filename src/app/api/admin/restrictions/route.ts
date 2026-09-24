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

    const [accounts, apps] = await Promise.all([
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
        select: { linkedinUrl: true, email: true, onboardedAt: true, verifiedAt: true },
      }),
    ]);

    const analytics = computeRestrictionAnalytics(accounts, apps);
    return NextResponse.json(analytics);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    const code = msg === "Forbidden" ? 403 : msg === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
