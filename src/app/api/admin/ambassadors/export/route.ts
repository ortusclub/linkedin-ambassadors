import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// CSV export of ambassador submissions, for Google Sheets to auto-pull via
// =IMPORTDATA("https://linkedvelocity.com/api/admin/ambassadors/export?key=XXXX").
// Shares the same secret as the other exports (RENTALS_EXPORT_KEY).
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

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  const expected = process.env.RENTALS_EXPORT_KEY;
  if (!expected || !key || key !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const applications = await prisma.ambassadorApplication.findMany({ orderBy: { createdAt: "desc" } });

  // Current contact number from the user profile, if they have an account.
  const emails = [...new Set(applications.map((a) => a.email))];
  const users = emails.length
    ? await prisma.user.findMany({ where: { email: { in: emails } }, select: { email: true, contactNumber: true } })
    : [];
  const contactMap = new Map(users.map((u) => [u.email, u.contactNumber]));

  const cleanContact = (c: string | null) => (c || "").replace(/^(whatsapp|telegram):/, "");

  const headers = [
    "Account Name", "Owner Email (POC)", "LinkedIn Login Email", "LinkedIn URL", "Contact",
    "Connections", "Location", "Status", "Payment Method", "Notes", "Applied",
  ];

  const rows = applications.map((a) => [
    a.fullName,
    a.email,
    a.linkedinEmail || "",
    a.linkedinUrl || "",
    cleanContact(contactMap.get(a.email) || a.contactNumber),
    a.connectionCount ? String(a.connectionCount) : "",
    a.location || "",
    a.status,
    a.paymentMethod || (a.paypalEmail ? `PayPal: ${a.paypalEmail}` : a.wiseEmail ? `Wise: ${a.wiseEmail}` : ""),
    a.notes || "",
    fmtDate(a.createdAt),
  ]);

  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "no-store" },
  });
}
