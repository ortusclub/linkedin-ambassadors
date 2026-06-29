import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// CSV export of the blog/content pipeline for Google Sheets via
// =IMPORTDATA("https://linkedvelocity.com/api/admin/content/export?key=XXXX").
// Auth = shared secret in the URL (RENTALS_EXPORT_KEY) since IMPORTDATA can't send headers.
export const dynamic = "force-dynamic";

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function fmtDate(d: Date | null): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

const STATUS_LABEL: Record<string, string> = {
  published: "Published (LIVE)",
  approved: "Approved (scheduled)",
  in_review: "In Review",
  draft: "Draft",
};
// order: live first, then ready, then in-progress
const STATUS_ORDER: Record<string, number> = { published: 0, approved: 1, in_review: 2, draft: 3 };

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  const expected = process.env.RENTALS_EXPORT_KEY;
  if (!expected || !key || key !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const posts = await prisma.blogPost.findMany();
  posts.sort((a, b) => {
    const s = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
    if (s !== 0) return s;
    const da = (a.publishedAt ?? a.scheduledFor)?.getTime() ?? 0;
    const db = (b.publishedAt ?? b.scheduledFor)?.getTime() ?? 0;
    return da - db;
  });

  const headers = ["Title", "Status", "Date", "Category", "Target Keyword", "Live URL"];
  const rows = posts.map((p) => [
    p.title,
    STATUS_LABEL[p.status] || p.status,
    fmtDate(p.publishedAt ?? p.scheduledFor),
    p.category,
    p.keyword || "",
    p.status === "published" ? `https://linkedvelocity.com/blog/${p.slug}` : "",
  ]);

  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "no-store" },
  });
}
