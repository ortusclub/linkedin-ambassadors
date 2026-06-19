import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { paymentStatus, accessStatus } from "@/lib/rental-tracker";

// CSV export of the renter tracker, for Google Sheets to auto-pull via
// =IMPORTDATA("https://linkedvelocity.com/api/admin/rentals/export?key=XXXX").
// Auth is a shared secret in the URL (RENTALS_EXPORT_KEY) because IMPORTDATA
// can't send headers. Keep the key private — anyone with the link sees the data.
export const dynamic = "force-dynamic";

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  // Escape quotes + wrap if it contains comma/quote/newline.
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function fmtDate(d: Date | null): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10); // YYYY-MM-DD — Sheets-friendly
}

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  const expected = process.env.RENTALS_EXPORT_KEY;
  if (!expected || !key || key !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rentals = await prisma.rental.findMany({
    include: {
      user: { select: { id: true, fullName: true, email: true, contactNumber: true, company: true, industry: true } },
      linkedinAccount: { select: { linkedinName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const liveCounts = new Map<string, number>();
  for (const r of rentals) {
    if (r.status === "active" || r.status === "pending_access") {
      liveCounts.set(r.userId, (liveCounts.get(r.userId) || 0) + 1);
    }
  }

  // Payment method by how the renter funded us (card top-up => Stripe, crypto => USDC).
  const userIds = [...new Set(rentals.map((r) => r.userId))];
  const deposits = userIds.length
    ? await prisma.transaction.findMany({ where: { userId: { in: userIds }, type: "deposit" }, select: { userId: true, description: true } })
    : [];
  const fundingByUser = new Map<string, "Stripe" | "USDC">();
  for (const d of deposits) {
    if ((d.description || "").startsWith("stripe_topup")) fundingByUser.set(d.userId, "Stripe");
    else if (!fundingByUser.has(d.userId)) fundingByUser.set(d.userId, "USDC");
  }
  const payMethod = (r: { userId: string; usdcPayment: boolean }) => fundingByUser.get(r.userId) || (r.usdcPayment ? "USDC" : "Stripe");

  // Column order mirrors the internal "Renters" sheet so it drops straight in.
  const headers = [
    "Renter / Company", "Contact Name", "Email", "Phone / Telegram", "Industry",
    "Accounts Rented", "Account(s) Used", "Billing Start Date", "Next Billing Date",
    "Auto-Renew", "Payment Method", "Payment Status", "LV PoC", "Notes",
  ];

  const rows = rentals.map((r) => [
    r.user.company || r.user.fullName,
    r.user.fullName,
    r.user.email,
    r.user.contactNumber || "",
    r.user.industry || "",
    String(liveCounts.get(r.userId) || 0),
    r.linkedinAccount.linkedinName,
    fmtDate(r.startDate),
    fmtDate(r.currentPeriodEnd),
    r.autoRenew ? "Yes" : "No",
    payMethod(r),
    paymentStatus(r),
    r.lvPoc || "",
    r.notes || "",
  ]);

  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
