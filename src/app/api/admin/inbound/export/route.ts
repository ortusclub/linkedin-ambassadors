import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// CSV export of inbound leads for Google Sheets via
// =IMPORTDATA("https://linkedvelocity.com/api/admin/inbound/export?key=XXXX").
// Column order matches the internal Inbound Lead Tracker sheet. Auth = shared
// secret in the URL (RENTALS_EXPORT_KEY) since IMPORTDATA can't send headers.
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

const platformLabel = (c: string) =>
  c === "telegram" ? "Telegram" : c === "website" ? "Website" : c === "call" ? "Call booking" : c === "whatsapp" ? "WhatsApp" : c;

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  const expected = process.env.RENTALS_EXPORT_KEY;
  if (!expected || !key || key !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const leads = await prisma.inboundLead.findMany({ orderBy: { firstContactAt: "desc" } });

  const headers = [
    "Date", "Name / Username", "Platform", "Company / Email", "Type",
    "Use Case / Message", "Status", "Replied?", "Follow Up Date", "Outcome", "Notes",
  ];
  const rows = leads.map((l) => [
    fmtDate(l.firstContactAt),
    l.handle || l.name,
    platformLabel(l.channel),
    l.companyEmail || "",
    l.type || "",
    l.message || "",
    l.status,
    l.replied ? "Yes" : "No",
    fmtDate(l.followUpDate),
    l.outcome || "",
    l.notes || "",
  ]);

  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "no-store" },
  });
}
