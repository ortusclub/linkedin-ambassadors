import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// CSV export of the CRM for Google Sheets via
// =IMPORTDATA("https://linkedvelocity.com/api/admin/inbound/export?key=XXXX").
// Rows are GROUPED by CRM stage into sections (Active Clients / Pipeline-Warm / Cold /…),
// with a section header row before each group, so Sam's sheet lays out on its own.
// The existing 10 columns keep their order (IMPORTDATA is position-based); a "Stage" and a
// timestamped "Comms History" column are APPENDED at the end — the auto, no-manual-comment
// replacement for cell comments.
export const dynamic = "force-dynamic";

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function fmtDate(d: Date | string | null): string {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

const platformLabel = (c: string) =>
  c === "telegram" ? "Telegram" : c === "website" ? "Website" : c === "call" ? "Call booking" : c === "whatsapp" ? "WhatsApp" : c === "renter" ? "Renter" : c === "manual" ? "Manual" : c;

// Build the timestamped touchbase log for one contact into a single multi-line cell.
function commsHistory(log: unknown): string {
  if (!Array.isArray(log) || log.length === 0) return "";
  return log
    .map((c) => {
      const e = c as { ts?: string; channel?: string; body?: string };
      return `${fmtDate(e.ts || null)} · ${e.channel || "note"}: ${e.body || ""}`.trim();
    })
    .join("\n");
}

const SECTIONS: [string, string][] = [
  ["active", "ACTIVE CLIENTS"],
  ["warm", "PIPELINE / WARM"],
  ["cold", "COLD"],
  ["new", "NEW / UNSORTED"],
  ["lost", "LOST"],
];

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  const expected = process.env.RENTALS_EXPORT_KEY;
  if (!expected || !key || key !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const leads = await prisma.inboundLead.findMany({ orderBy: { lastContactAt: "desc" } });

  const headers = [
    "Date", "Name / Username", "Platform", "Company / Email", "Type",
    "Use Case / Message", "Status", "Follow Up Date", "Outcome", "Notes",
    "Stage", "Comms History (newest first)",
  ];
  const width = headers.length;
  const rowFor = (l: (typeof leads)[number]) => [
    fmtDate(l.firstContactAt),
    l.handle || l.name,
    platformLabel(l.channel),
    l.companyEmail || "",
    l.type || "",
    l.message || "",
    l.status,
    fmtDate(l.followUpDate),
    l.outcome || "",
    l.notes || "",
    (l.stage || "new"),
    commsHistory(l.commsLog),
  ];

  const out: string[][] = [headers];
  for (const [stage, label] of SECTIONS) {
    const group = leads.filter((l) => (l.stage || "new") === stage);
    if (group.length === 0) continue;
    const section = new Array(width).fill("");
    section[0] = `— ${label} (${group.length}) —`;
    out.push(section);
    for (const l of group) out.push(rowFor(l));
  }

  const csv = out.map((row) => row.map(csvCell).join(",")).join("\n");
  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "no-store" },
  });
}
