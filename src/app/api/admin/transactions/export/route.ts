import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { txMethod } from "@/lib/tx-method";

// CSV export of transactions for Google Sheets via
// =IMPORTDATA("https://linkedvelocity.com/api/admin/transactions/export?key=XXXX").
// Auth = shared secret in the URL (RENTALS_EXPORT_KEY) since IMPORTDATA can't send headers.
export const dynamic = "force-dynamic";

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
const fmtDateTime = (d: Date) => d.toLocaleString("en-US", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  const expected = process.env.RENTALS_EXPORT_KEY;
  if (!expected || !key || key !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const txs = await prisma.transaction.findMany({
    include: { user: { select: { fullName: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  const headers = ["Date", "User", "Email", "Type", "Method", "Amount (USDC)", "Description", "Tx Hash"];
  const rows = txs.map((t) => [
    fmtDateTime(t.createdAt),
    t.user.fullName,
    t.user.email,
    t.type.replace(/_/g, " "),
    txMethod(t),
    Number(t.amount).toFixed(2),
    t.description || "",
    t.txHash || "",
  ]);

  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "no-store" } });
}
