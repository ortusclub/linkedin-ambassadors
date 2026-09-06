import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// CSV export of the onboarding pipeline, for Google Sheets to auto-pull via
// =IMPORTDATA("https://linkedvelocity.com/api/admin/onboarding/export?key=XXXX").
// Same shared-key auth as the inventory export (RENTALS_EXPORT_KEY) — IMPORTDATA
// can't send headers, so the key rides in the URL. Keep the sheet private.
//
// Rows come out in the SAME section order as /admin/onboarding (Initial,
// Processing, Rejected, Onboarded, Unreachable) with the section in column A, so
// the sheet reads top-to-bottom like the dashboard does. Account credentials are
// deliberately NOT included — this feed is the pipeline, not the inventory.
export const dynamic = "force-dynamic";

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const fmtDate = (d: Date | null | undefined) =>
  d ? d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "";

type Bucket = "initial" | "processing" | "rejected" | "onboarded" | "unreachable";
const SECTION_ORDER: Bucket[] = ["initial", "processing", "rejected", "onboarded", "unreachable"];
const SECTION_TITLE: Record<Bucket, string> = {
  initial: "Initial",
  processing: "Processing",
  rejected: "Rejected",
  onboarded: "Onboarded",
  unreachable: "Unreachable",
};

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  const expected = process.env.RENTALS_EXPORT_KEY;
  if (!expected || !key || key !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apps = await prisma.ambassadorApplication.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      fullName: true, email: true, contactNumber: true, contactChannel: true,
      linkedinUrl: true, connectionCount: true, location: true, status: true,
      createdAt: true, onboardedAt: true, verifiedAt: true, paidAt: true,
      accountIssue: true, adminNotes: true, referredBy: true, referralSource: true,
      industry: true, poc: true, accountFreshness: true, ownerStatus: true,
      paymentMethod: true, payoutName: true, paypalEmail: true, wiseEmail: true,
    },
  });

  const accounts = await prisma.linkedInAccount.findMany({
    where: { status: { notIn: ["removed"] } },
    select: {
      linkedinName: true, linkedinUrl: true, loginEmail: true, accountPassword: true,
      gologinProfileId: true, gologinShareLink: true, monthlyPrice: true,
      ambassadorPayment: true, connectionCount: true, status: true, notes: true,
    },
  });

  // Application -> account matching, identical to /api/admin/onboarding: unique
  // LinkedIn URL first, then the "Owner: <email>" note but ONLY when that email
  // maps to exactly one account (a shared POC inbox can't disambiguate).
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
    const acct = (appUrl ? byUrl.get(appUrl) : undefined) || (ownerCount.get(email) === 1 ? byOwner.get(email) : undefined) || null;
    const hasGologin = !!(acct?.gologinProfileId || acct?.gologinShareLink);

    // Same bucketing rules as the dashboard: "onboarded" sticks even without a
    // GoLogin, but the reason column says so, so the gap stays visible.
    let bucket: Bucket;
    let reason: string;
    if (app.status === "rejected") { bucket = "rejected"; reason = "Rejected"; }
    else if (app.status === "pending") { bucket = "initial"; reason = "New application"; }
    else if (app.status === "contacted") { bucket = "initial"; reason = "Awaiting reply"; }
    else if (app.status === "onboarded") {
      bucket = "onboarded";
      reason = hasGologin ? "Onboarded" : acct ? "Onboarded · no GoLogin found" : "Onboarded · no account linked";
    }
    else if (app.status === "unreachable") { bucket = "unreachable"; reason = "Unreachable"; }
    else {
      bucket = "processing";
      reason = app.status === "onboarding" ? "Onboarding · warming up" : app.status === "approved" ? "Approved · awaiting onboarding" : app.status === "on_hold" ? "On hold" : "In review";
    }

    const payout = Number(acct?.ambassadorPayment || 0);
    const price = Number(acct?.monthlyPrice || 0);
    return {
      bucket,
      cells: [
        SECTION_TITLE[bucket],
        reason,
        app.fullName || "",
        app.email || "",
        app.contactNumber || "",
        app.contactChannel || "",
        app.linkedinUrl || "",
        acct?.connectionCount ?? app.connectionCount ?? "",
        app.location || "",
        app.industry || "",
        app.accountFreshness || "",
        app.ownerStatus || "",
        app.poc || "",
        app.referredBy || app.referralSource || "",
        fmtDate(app.createdAt),
        fmtDate(app.verifiedAt),
        fmtDate(app.paidAt),
        fmtDate(app.onboardedAt),
        acct?.linkedinName || "",
        acct?.status || "",
        hasGologin ? "Yes" : "No",
        acct?.loginEmail && acct?.accountPassword ? "Yes" : "No",
        price > 0 ? `$${price.toFixed(0)}` : "",
        payout > 0 ? `₱${payout.toFixed(0)}` : "",
        app.paymentMethod || (app.paypalEmail ? `PayPal: ${app.paypalEmail}` : app.wiseEmail ? `Wise: ${app.wiseEmail}` : ""),
        app.payoutName || "",
        app.accountIssue || "",
        app.adminNotes || "",
      ],
    };
  });

  // Section order first, newest-first within each section (apps already come back
  // ordered by createdAt desc, and sort is stable).
  const sorted = [...rows].sort((a, b) => SECTION_ORDER.indexOf(a.bucket) - SECTION_ORDER.indexOf(b.bucket));

  const headers = [
    "Section", "Stage", "Name", "Email", "Contact", "Channel", "LinkedIn URL",
    "Connections", "Location", "Industry", "Account Freshness", "Owner Status",
    "POC", "Referred By",
    "Applied", "Verified", "Setup Paid", "Onboarded",
    "Account", "Account Status", "GoLogin", "Login Held",
    "Monthly Price", "Ambassador Payout", "Payment Method", "Payout Name",
    "Issue", "Admin Notes",
  ];

  const csv = [headers, ...sorted.map((r) => r.cells)].map((row) => row.map(csvCell).join(",")).join("\n");
  return new NextResponse(csv, {
    status: 200,
    headers: { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "no-store" },
  });
}
