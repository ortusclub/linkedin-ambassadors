import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// Onboarding pipeline — every ambassador application, bucketed by how far along it
// is. The one non-obvious rule: an application only counts as ONBOARDED once the
// account we hold for it actually has a GoLogin profile or share link. Without one
// the account can't be run, so onboarding isn't finished no matter what the status
// column says — those rows stay in Processing, flagged.

type Bucket = "initial" | "processing" | "rejected" | "onboarded";

export async function GET() {
  try {
    await requireAdmin();

    const apps = await prisma.ambassadorApplication.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, fullName: true, email: true, contactNumber: true, contactChannel: true,
        linkedinUrl: true, connectionCount: true, location: true, status: true,
        createdAt: true, onboardedAt: true, verifiedAt: true, paidAt: true,
        accountIssue: true, adminNotes: true,
      },
    });

    const accounts = await prisma.linkedInAccount.findMany({
      where: { status: { notIn: ["removed"] } },
      select: {
        id: true, linkedinName: true, linkedinUrl: true, loginEmail: true,
        accountPassword: true, gologinProfileId: true, gologinShareLink: true,
        connectionCount: true, status: true, notes: true,
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
        if (hasGologin) { bucket = "onboarded"; reason = "Onboarded"; }
        else { bucket = "processing"; reason = acct ? "Marked onboarded · no GoLogin yet" : "Marked onboarded · no account yet"; }
      } else {
        bucket = "processing";
        reason = app.status === "unreachable" ? "Unreachable" : app.status === "approved" ? "Approved · awaiting onboarding" : app.status === "on_hold" ? "On hold" : app.status === "contacted" ? "Contacted" : "In review";
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
        bucket,
        reason,
        hasGologin,
        hasLogin,
        accountId: acct?.id || null,
        accountName: acct?.linkedinName || null,
        accountStatus: acct?.status || null,
        loginEmail: acct?.loginEmail || null,
        gologinShareLink: acct?.gologinShareLink || null,
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
