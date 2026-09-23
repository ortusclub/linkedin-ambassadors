import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto-creds";

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
        createdAt: true, onboardedAt: true, verifiedAt: true, qcChecks: true, emailPrimaryAt: true, paidAt: true,
        accountIssue: true, onboardingFix: true, adminNotes: true, notes: true,
        outreachLog: true, nextFollowUp: true, callOutcome: true,
        referredBy: true, payoutCurrency: true, referralSource: true, industry: true, poc: true,
        linkedinEmail: true, bookingEmail: true, accountFreshness: true,
        paymentMethod: true, paymentDetails: true, payoutName: true,
        paypalEmail: true, wiseEmail: true, ownerStatus: true,
      },
    });

    const accounts = await prisma.linkedInAccount.findMany({
      where: { status: { notIn: ["removed"] } },
      select: {
        id: true, linkedinName: true, linkedinUrl: true, loginEmail: true,
        personalEmail: true, workEmail: true, accountPassword: true, twoFactor: true,
        gologinProfileId: true, gologinShareLink: true, monthlyPrice: true,
        ambassadorPayment: true, connectionCount: true, status: true,
        restrictedAt: true, restrictionLog: true, notes: true, linkedinVerified: true,
        proxyHost: true, proxyPort: true, proxyUsername: true,
        proxyPassword: true, proxyLocation: true, provisionStatus: true,
      },
    });

    // DIY phone hand-offs waiting for us to do the GoLogin sign-in. state "handed_off"
    // is set only by the phone hand-off, so it marks "handed to the team" — but it is never
    // cleared once we sign in, so the "Needs sign-in" badge below also requires that the
    // account hasn't been logged in yet (onboardedAt unset). Once it's logged in, the
    // sign-in is done and the badge must drop.
    const handoffAppIds = new Set(
      (await prisma.selfServiceOnboarding.findMany({ where: { state: "handed_off" }, select: { applicationId: true } }))
        .map((s) => s.applicationId)
    );

    // Referrer contact lookup (by slug) — used to build reminder links (WhatsApp
    // click-to-send / Telegram) next to a raised onboarding issue on the pipeline.
    const referrers = await prisma.referrer.findMany({
      select: { slug: true, name: true, token: true, contactMethod: true, contactHandle: true, contacts: true },
    });
    const refBySlug = new Map(referrers.map((r) => [r.slug.toLowerCase(), r]));
    // LV PoC = the LinkedVelocity rep who onboards an account. It is NOT the referrer
    // (the marketer who sent the lead) nor the ambassador. Older data sometimes has a
    // referrer/applicant name in the poc field, so we blank any poc that matches one —
    // only a genuine LV-rep name survives as a PoC.
    const notPocNames = new Set<string>();
    for (const rf of referrers) if (rf.name) notPocNames.add(rf.name.trim().toLowerCase());
    for (const ap of apps) if (ap.fullName) notPocNames.add(ap.fullName.trim().toLowerCase());
    const cleanPoc = (poc?: string | null) => {
      const p = (poc || "").trim();
      return p && !notPocNames.has(p.toLowerCase()) ? p : null;
    };
    type RefC = { method?: string; handle?: string; preferred?: boolean };
    const refContact = (slug?: string | null) => {
      const rf = refBySlug.get((slug || "").trim().toLowerCase());
      if (!rf) return null;
      const list: RefC[] = Array.isArray(rf.contacts)
        ? (rf.contacts as RefC[])
        : rf.contactHandle
          ? [{ method: rf.contactMethod || "WhatsApp", handle: rf.contactHandle, preferred: true }]
          : [];
      const byMethod = (m: string) => list.find((c) => (c.method || "").toLowerCase() === m)?.handle || null;
      const wa = byMethod("whatsapp");
      const tg = byMethod("telegram");
      const pref = list.find((c) => c.preferred) || list[0];
      return {
        name: rf.name,
        token: rf.token,
        whatsapp: wa ? wa.replace(/[^0-9]/g, "") : null,
        telegram: tg ? tg.replace(/^@/, "").trim() : null,
        preferred: pref?.method || null,
      };
    };

    // Match an application to its account the same way the rest of the admin does:
    // Match an application to its account by the UNIQUE LinkedIn URL first, then fall
    // back to the "Owner: <email>" line in the account notes — but ONLY when that email
    // maps to a single account. A shared owner email (e.g. a POC/referrer inbox used by
    // several applicants, like najendeleon@gmail.com) can't disambiguate, so email-only
    // matching there would wrongly hand every applicant the same first account.
    const normUrl = (u?: string | null) => (u || "").split("?")[0].replace(/\/+$/, "").toLowerCase().trim();
    const byOwner = new Map<string, (typeof accounts)[number]>();
    const ownerCount = new Map<string, number>();
    const byUrl = new Map<string, (typeof accounts)[number]>();
    for (const a of accounts) {
      const owner = (a.notes || "").match(/Owner:\s*(\S+@\S+)/)?.[1]?.replace(/\.$/, "")?.toLowerCase();
      if (owner) {
        ownerCount.set(owner, (ownerCount.get(owner) || 0) + 1);
        if (!byOwner.has(owner)) byOwner.set(owner, a);
      }
      const u = normUrl(a.linkedinUrl);
      if (u && !byUrl.has(u)) byUrl.set(u, a);
    }

    const rows = apps.map((app) => {
      const appUrl = normUrl(app.linkedinUrl);
      const email = app.email.toLowerCase();
      const acct =
        (appUrl ? byUrl.get(appUrl) : undefined) ||
        (ownerCount.get(email) === 1 ? byOwner.get(email) : undefined) ||
        null;

      const hasGologin = !!(acct?.gologinProfileId || acct?.gologinShareLink);
      const hasLogin = !!(acct?.loginEmail && acct?.accountPassword);

      // Bucketing. "onboarded" only sticks if a GoLogin actually exists; otherwise the
      // row drops back into Processing so it shows up as work still to do.
      let bucket: Bucket;
      let reason = "";
      if (app.status === "rejected") { bucket = "rejected"; reason = "Rejected"; }
      else if (app.status === "pending") { bucket = "initial"; reason = "New application"; }
      // Contacted = we've reached out and are waiting to hear back. Kept in the Initial
      // section (still a lead you're chasing, not yet in the pipeline), badged apart.
      else if (app.status === "contacted") { bucket = "initial"; reason = "Awaiting reply"; }
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
        reason = app.status === "onboarding" ? "Level 1 · waiting (before GoLogin / login)" : app.status === "approved" ? "Level 2 · GoLogin ready, verifying before payout" : app.status === "on_hold" ? "On hold" : "In review";
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
        onboardingFix: app.onboardingFix,
        adminNotes: app.adminNotes,
        applicationNotes: app.notes,
        outreachLog: (app.outreachLog as { ch: string; text: string; by?: string; at: string }[] | null) || null,
        nextFollowUp: app.nextFollowUp,
        callOutcome: app.callOutcome,
        referredBy: app.referredBy,
        referrer: refContact(app.referredBy),
        payoutCurrency: app.payoutCurrency,
        referralSource: app.referralSource,
        industry: app.industry,
        poc: cleanPoc(app.poc),
        linkedinEmail: app.linkedinEmail,
        bookingEmail: app.bookingEmail,
        accountFreshness: app.accountFreshness,
        ownerStatus: app.ownerStatus,
        paymentMethod: app.paymentMethod || (app.paypalEmail ? `PayPal: ${app.paypalEmail}` : app.wiseEmail ? `Wise: ${app.wiseEmail}` : null),
        paymentDetails: app.paymentDetails,
        payoutName: app.payoutName,
        verifiedAt: app.verifiedAt,
        qcChecks: app.qcChecks,
        emailPrimaryAt: app.emailPrimaryAt,
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
        workEmail: acct?.workEmail || null,
        hasPassword: !!acct?.accountPassword,
        has2fa: !!acct?.twoFactor,
        accountPassword: decryptSecret(acct?.accountPassword) || null,
        twoFactor: decryptSecret(acct?.twoFactor) || null,
        gologinProfileId: acct?.gologinProfileId || null,
        gologinShareLink: acct?.gologinShareLink || null,
        proxyHost: acct?.proxyHost || null,
        proxyPort: acct?.proxyPort ?? null,
        proxyUsername: acct?.proxyUsername || null,
        proxyPassword: acct?.proxyPassword || null,
        proxyLocation: acct?.proxyLocation || null,
        accountRestrictedAt: acct?.restrictedAt || null,
        accountRestrictionLog: acct?.restrictionLog || null,
        monthlyPrice: acct?.monthlyPrice != null ? Number(acct.monthlyPrice) : null,
        ambassadorPayment: acct?.ambassadorPayment != null ? Number(acct.ambassadorPayment) : null,
        accountNotes: acct?.notes || null,
        linkedinVerified: !!acct?.linkedinVerified,
        provisionStatus: acct?.provisionStatus || null,
        connectionCount: acct?.connectionCount ?? app.connectionCount ?? null,
        // DIY phone hand-off: owner is on a phone, so LinkedVelocity must do the sign-in.
        // Only "pending" until the account is actually logged in (onboardedAt stamped).
        phoneHandoffPending: handoffAppIds.has(app.id) && !app.onboardedAt,
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
