import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// CSV export of the inventory, for Google Sheets to auto-pull via
// =IMPORTDATA("https://linkedvelocity.com/api/admin/accounts/export?key=XXXX").
// Shares the same secret as the rentals export (RENTALS_EXPORT_KEY). IMPORTDATA
// can't send headers, so auth is a shared key in the URL — keep it private.
export const dynamic = "force-dynamic";

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function fmtDate(d: Date | null): string {
  if (!d) return "";
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

function displayStatus(s: string): string {
  if (s === "available") return "Available";
  if (s === "rented") return "Rented";
  if (s === "removed") return "Removed";
  return "Offline";
}

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  const expected = process.env.RENTALS_EXPORT_KEY;
  if (!expected || !key || key !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accounts = await prisma.linkedInAccount.findMany({
    where: { status: { in: ["under_review", "available", "rented", "maintenance", "unavailable", "retired"] } },
    include: {
      rentals: {
        where: { status: "active" },
        include: { user: { select: { fullName: true } } },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Resolve owner (ambassador) names from the "Owner: email" tag in notes.
  const ownerEmails = accounts
    .map((a) => (a.notes || "").match(/Owner:\s*(\S+@\S+)/)?.[1]?.replace(/\.$/, ""))
    .filter(Boolean) as string[];
  const ownerUsers = ownerEmails.length
    ? await prisma.user.findMany({ where: { email: { in: ownerEmails } }, select: { email: true, fullName: true } })
    : [];
  const ownerMap = new Map(ownerUsers.map((u) => [u.email, u.fullName]));

  // Group by status so available / rented / offline sit together (matches the admin view).
  const rank: Record<string, number> = { available: 0, rented: 1, unavailable: 2, maintenance: 2, retired: 2, under_review: 3 };
  const sorted = [...accounts].sort((a, b) => (rank[a.status] ?? 5) - (rank[b.status] ?? 5));

  // Grouped left->right: identity/quality, rental state, money, profile detail, access.
  const headers = [
    "LinkedIn Account", "Headline / Title", "Status", "Verified",
    "Renter", "Rented Until", "Auto Renew",
    "Monthly Price", "Ambassador Payout", "Owner",
    "Location", "Number of Connections", "Sales Navigator", "LinkedIn URL",
    "GoLogin Profile ID", "Shareable Link",
  ];

  const rows = sorted.map((a) => {
    const rental = a.rentals[0];
    const ownerEmail = (a.notes || "").match(/Owner:\s*(\S+@\S+)/)?.[1]?.replace(/\.$/, "") || "";
    const profileEmail = (a.notes || "").match(/Profile email:\s*(\S+@\S+?\.\S+?)[\s.]/)?.[1];
    const price = rental?.lockedPrice != null && Number(rental.lockedPrice) > 0
      ? Number(rental.lockedPrice)
      : Number(a.monthlyPrice || 0);
    const payout = Number(a.ambassadorPayment || 0);
    // Owner: showcase/demo accounts => "Dummy"; our own Ortus accounts => "ORTUS";
    // otherwise the ambassador who supplied it.
    const isShowcase = (a.notes || "").includes("[SHOWCASE]");
    const isOrtus = [profileEmail, ownerEmail].some((e) => (e || "").toLowerCase().endsWith("@ortus.solutions"));
    const ownerDisplay = isShowcase ? "Dummy" : isOrtus ? "ORTUS" : (ownerMap.get(ownerEmail) || ownerEmail || "");
    return [
      profileEmail || a.linkedinName,
      a.linkedinHeadline || "",
      displayStatus(a.status),
      a.verificationProof ? "Yes" : "No",
      rental ? rental.user.fullName : "",
      rental ? fmtDate(rental.currentPeriodEnd) : "",
      rental ? (rental.autoRenew ? "Yes" : "No") : "",
      price > 0 ? `$${price.toFixed(0)}` : "",
      payout > 0 ? `$${payout.toFixed(0)}` : "",
      ownerDisplay,
      a.location || "",
      a.connectionCount > 0 ? String(a.connectionCount) : "",
      a.hasSalesNav ? "Yes" : "No",
      a.linkedinUrl || "",
      a.gologinProfileId || "",
      a.gologinShareLink || "",
    ];
  });

  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "no-store" },
  });
}
