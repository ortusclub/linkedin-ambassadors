import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { restrictionUpdate } from "@/lib/restriction";

// Admin: mark a rented account as restricted (LinkedIn restricted it, we're recovering)
// or clear it (recovered). On recover, credit the active rental's downtime by extending
// currentPeriodEnd by the time it was restricted.
// Body: { restricted: boolean }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const restrict = !!body.restricted;
    const note = typeof body.note === "string" ? body.note.trim() : "";

    const account = await prisma.linkedInAccount.findUnique({ where: { id } });
    if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    // Single source of truth for the restrict/recover event + shared log (also used by
    // the account PATCH route, so pipeline restriction changes are logged identically).
    const fields = await restrictionUpdate(account, restrict, note);
    const updated = await prisma.linkedInAccount.update({
      where: { id },
      data: { restrictedAt: fields.restrictedAt, ...(fields.restrictionLog ? { restrictionLog: fields.restrictionLog } : {}) },
    });
    return NextResponse.json({ restrictedAt: updated.restrictedAt, creditedDays: fields.creditedDays ?? 0, restrictionLog: updated.restrictionLog });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    const code = msg === "Forbidden" ? 403 : msg === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
