import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

type Row = {
  id: string;
  to: string;
  subject: string;
  bcc: string | null;
  status: string;
  error: string | null;
  body: string | null;
  created_at: Date;
};

// In-app email log — every email the app sends is recorded in email_log (see services/email.ts).
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const q = (req.nextUrl.searchParams.get("q") || "").trim();
    const rows = q
      ? await prisma.$queryRaw<Row[]>`
          SELECT id, "to", subject, bcc, status, error, body, created_at FROM email_log
          WHERE "to" ILIKE ${"%" + q + "%"} OR subject ILIKE ${"%" + q + "%"}
          ORDER BY created_at DESC LIMIT 300`
      : await prisma.$queryRaw<Row[]>`
          SELECT id, "to", subject, bcc, status, error, body, created_at FROM email_log
          ORDER BY created_at DESC LIMIT 300`;
    return NextResponse.json({
      emails: rows.map((r) => ({
        id: r.id,
        to: r.to,
        subject: r.subject,
        bcc: r.bcc,
        status: r.status,
        error: r.error,
        body: r.body,
        createdAt: r.created_at,
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg === "Unauthorized" || msg === "Forbidden") {
      return NextResponse.json({ error: msg }, { status: msg === "Forbidden" ? 403 : 401 });
    }
    console.error("admin emails error:", msg);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
