import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// Onboarding pipeline — every ambassador application, bucketed by how far along it
// is. The one non-obvious rule: an application only counts as ONBOARDED once the
// account we hold for it actually has a GoLogin profile or share link. Without one
// the account can't be run, so onboarding isn't finished no matter what the status
// column says — those rows stay in Processing, flagged.

type Bucket = "initial" | "processing" | "rejected" | "onboarded" | "unreachable";

export async function GET() {
  try {
    await requireAdmin();

    const apps = await prisma.ambassadorApplication.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, fullName: true, email: true, contactNumber: true, contactChannel: true,
        linkedinUrl: true, connectionCount: true, location: true, status: true,
        createdAt: true, onboardedAt: true, verifiedAt: true, paidAt: true,
        accountIssue: true, adminNotes: true, notes: true,
        referredBy: true, referralSource: true, industry: true, poc: true,
        linkedinEmail: true, bookingEmail: true, accountFreshness: true,
        paymentMethod: true, paymentDetails: true, payoutName: true,
        paypalEmail: true, wiseEmail: true, ownerStatus: true,
      },
    });

    const accounts = await prisma.linkedInAccount.findMany({
      where: { status: { notIn: ["removed"] } },
      select: {
        id: true, linkedinName: true, linkedinUrl: true, loginEmail: true,
        personalEmail: true, accountPassword: true, twoFactor: true,
        gologinProfileId: true, gologinShareLink: true, monthlyPrice: true,
        ambassadorPayment: true, connectionCount: true, status: true,
        restrictedAt: true, notes: true, linkedinVerified: true,
      },
    });

    // Match an application to its account the same way the rest of the admin does:
    // the "Owner: <email>" line in the account notes first, then the LinkedIn URL.
    const byOwner = new Map<string, (typeof accounts)[number]>();
    const byUrl = new Map<string, (typeof accounts)[number]>();
    for (const a of accounts) {
      const owner = (a.notes || "").match(/Owner:\s*(\S+@\S+)/)?.[1]?.replace(/\.$/, "");
      if (owner && !byOwner.has(owner.toLowerCase())) byOwner.set(owner.toLowerCase(), a);
      if (a.linkedinUrl) {
        const u = a.linkedinUrl.replace(/\/$/, "");
        if (!byUrl.has(u)) byUrl.set(u, a);
      }
    }

    const rows = apps.map((app) => {
      const acct =
        byOwner.get(app.email.toLowerCase()) ||
        (app.linkedinUrl ? byUrl.get(app.linkedinUrl.replace(/\/$/, "")) : undefined) ||
        null;

      const hasGologin = !!(acct?.gologinProfileId || acct?.gologinShareLink);
      const hasLogin = !!(acct?.loginEmail && acct?.accountPassword);

      // Bucketing. "onboarded" only sticks if a GoLogin actually exists; otherwise the
      // row drops back into Processing so it shows up as work still to do.
      let bucket: Bucket;
      let reason = "";
      if (app.status === "rejected") { bucket = "rejected"; reason = "Rejected"; }
      else if (app.status === "pending") { bucket = "initial"; reason = "New application"; }
      else if (app.status === "onboarded") {
        // Onboarded rows stay in the Onboarded section even without a GoLogin — they
        // sort to the bottom of it and carry a "No GoLogin found" badge, so the gap is
        // visible without hiding someone who has otherwise been onboarded.
        bucket = "onboarded";
        reason = hasGologin ? "Onboarded" : acct ? "Onboarded · no GoLogin found" : "Onboarded · no account linked";
      }
      else if (app.status === "unreachable") { bucket = "unreachable"; reason = "Unreachable"; }
      else {
        bucket = "processing";
        reason = app.status === "onboarding" ? "Onboarding · warming up" : app.status === "approved" ? "Approved · awaiting onboarding" : app.status === "on_hold" ? "On hold" : app.status === "contacted" ? "Contacted" : "In review";
      }

      return {
        id: app.id,
        fullName: app.fullName,
        email: app.email,
        contactNumber: app.contactNumber,
        contactChannel: app.contactChannel,
        linkedinUrl: app.linkedinUrl,
        location: app.location,
        status: app.status,
        createdAt: app.createdAt,
        onboardedAt: app.onboardedAt,
        accountIssue: app.accountIssue,
        adminNotes: app.adminNotes,
        applicationNotes: app.notes,
        referredBy: app.referredBy,
        referralSource: app.referralSource,
        industry: app.industry,
        poc: app.poc,
        linkedinEmail: app.linkedinEmail,
        bookingEmail: app.bookingEmail,
        accountFreshness: app.accountFreshness,
        ownerStatus: app.ownerStatus,
        paymentMethod: app.paymentMethod || (app.paypalEmail ? `PayPal: ${app.paypalEmail}` : app.wiseEmail ? `Wise: ${app.wiseEmail}` : null),
        paymentDetails: app.paymentDetails,
        payoutName: app.payoutName,
        verifiedAt: app.verifiedAt,
        setupPaidAt: app.paidAt,
        bucket,
        reason,
        hasGologin,
        hasLogin,
        accountId: acct?.id || null,
        accountName: acct?.linkedinName || null,
        accountStatus: acct?.status || null,
        loginEmail: acct?.loginEmail || null,
        personalEmail: acct?.personalEmail || null,
        hasPassword: !!acct?.accountPassword,
        has2fa: !!acct?.twoFactor,
        gologinProfileId: acct?.gologinProfileId || null,
        gologinShareLink: acct?.gologinShareLink || null,
        accountRestrictedAt: acct?.restrictedAt || null,
        monthlyPrice: acct?.monthlyPrice != null ? Number(acct.monthlyPrice) : null,
        ambassadorPayment: acct?.ambassadorPayment != null ? Number(acct.ambassadorPayment) : null,
        accountNotes: acct?.notes || null,
        linkedinVerified: !!acct?.linkedinVerified,
        connectionCount: acct?.connectionCount ?? app.connectionCount ?? null,
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
