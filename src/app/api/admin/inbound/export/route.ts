import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// CSV export of inbound leads (Telegram messagers, call bookings), for Google
// Sheets to auto-pull via =IMPORTDATA("https://linkedvelocity.com/api/admin/inbound/export?key=XXXX").
// Auth is a shared secret in the URL (RENTALS_EXPORT_KEY) because IMPORTDATA can't
// send headers. Keep the key private — anyone with the link sees the data.
export const dynamic = "force-dynamic";

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function fmt(d: Date | null): string {
  if (!d) return "";
  return d.toLocaleString("en-US", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
}

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  const expected = process.env.RENTALS_EXPORT_KEY;
  if (!expected || !key || key !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const leads = await prisma.inboundLead.findMany({ orderBy: { lastContactAt: "desc" } });

  const headers = [
    "Channel", "Name", "Handle", "Contact", "Latest message",
    "First contact", "Last contact", "# messages", "Status", "Notes",
  ];
  const rows = leads.map((l) => [
    l.channel === "telegram" ? "Telegram" : l.channel === "call" ? "Call booking" : l.channel,
    l.name,
    l.handle || "",
    l.contact || "",
    l.message || "",
    fmt(l.firstContactAt),
    fmt(l.lastContactAt),
    String(l.messageCount),
    l.status,
    l.notes || "",
  ]);

  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "no-store" },
  });
}
