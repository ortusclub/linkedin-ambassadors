import { NextRequest, NextResponse } from "next/server";
import { getProxies, type ProxyRow } from "@/lib/proxies";

// CSV export of the Proxies view for Google Sheets via
// =IMPORTDATA("https://linkedvelocity.com/api/admin/proxies/export?key=XXXX").
// Reads getProxies() — the SAME aggregation the admin page uses — so the proxy
// tab is a live mirror of the admin view, never a hand-kept copy.
//
// Rows are GROUPED by country, each preceded by a section-header row (matching
// the existing manual sheet's AUSTRALIA / GERMANY / ... bands). IMPORTDATA is
// position-based, so APPEND new columns at the end; never reorder.
//
// The proxy string carries credentials (host:port:user:pass) — operational data.
// Anyone with the tokenised URL can read it, so treat the sheet's sharing as
// sensitive. Reuses RENTALS_EXPORT_KEY.
export const dynamic = "force-dynamic";

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const NA_COUNTRY = "Unassigned";

// Title-case the manual type/provider for display; blank stays blank.
function titleCase(v: string | null): string {
  if (!v) return "";
  return v.charAt(0).toUpperCase() + v.slice(1);
}

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  const expected = process.env.RENTALS_EXPORT_KEY;
  if (!expected || !key || key !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const proxies = await getProxies();

  const headers = [
    "Proxy", "Country", "Proxy Name", "Provider", "Type",
    "LinkedIn Account", "# of accounts linked", "Status", "Notes",
  ];
  const width = headers.length;

  const rowFor = (p: ProxyRow) => [
    p.proxyString,
    p.country || "",
    p.label || "",
    p.provider || "",
    titleCase(p.type),
    p.accounts.join(", "),
    String(p.accountCount),
    p.status || (p.accountCount === 0 ? "Unused" : ""),
    p.notes || "",
  ];

  // Group by country in the order getProxies() already sorted them (Unassigned last).
  const out: string[][] = [headers];
  let currentCountry: string | null = null;
  for (const p of proxies) {
    const c = p.country || NA_COUNTRY;
    if (c !== currentCountry) {
      currentCountry = c;
      const count = proxies.filter((x) => (x.country || NA_COUNTRY) === c).length;
      const section = new Array(width).fill("");
      section[0] = `— ${c.toUpperCase()} (${count}) —`;
      out.push(section);
    }
    out.push(rowFor(p));
  }

  const csv = out.map((row) => row.map(csvCell).join(",")).join("\n");
  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "no-store" },
  });
}
