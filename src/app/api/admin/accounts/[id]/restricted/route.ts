import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

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

    // Append-only event history (restrictedAt only tracks the current open one).
    type RLog = { at: string; event: "restricted" | "recovered"; note?: string; creditedDays?: number };
    const log: RLog[] = Array.isArray(account.restrictionLog) ? (account.restrictionLog as unknown as RLog[]) : [];

    if (restrict) {
      const at = new Date();
      const entry: RLog = { at: at.toISOString(), event: "restricted", ...(note ? { note } : {}) };
      const updated = await prisma.linkedInAccount.update({
        where: { id },
        data: {
          // keep the original open timestamp if already restricted, else stamp now
          restrictedAt: account.restrictedAt ?? at,
          // only log a new event when it wasn't already restricted (avoid dupes on re-click)
          ...(account.restrictedAt ? {} : { restrictionLog: [...log, entry] }),
        },
      });
      return NextResponse.json({ restrictedAt: updated.restrictedAt, restrictionLog: updated.restrictionLog });
    }

    // recover: credit downtime to the active rental, then clear
    let creditedDays = 0;
    if (account.restrictedAt) {
      const downtimeMs = Date.now() - new Date(account.restrictedAt).getTime();
      const active = await prisma.rental.findFirst({
        where: { linkedinAccountId: id, status: { in: ["active", "pending_access"] } },
      });
      if (active?.currentPeriodEnd && downtimeMs > 0) {
        const extended = new Date(new Date(active.currentPeriodEnd).getTime() + downtimeMs);
        await prisma.rental.update({ where: { id: active.id }, data: { currentPeriodEnd: extended } });
        creditedDays = Math.round(downtimeMs / 86400000);
      }
    }
    const recoverEntry: RLog = {
      at: new Date().toISOString(),
      event: "recovered",
      ...(note ? { note } : {}),
      ...(creditedDays ? { creditedDays } : {}),
    };
    const updated = await prisma.linkedInAccount.update({
      where: { id },
      data: { restrictedAt: null, restrictionLog: [...log, recoverEntry] },
    });
    return NextResponse.json({ restrictedAt: updated.restrictedAt, creditedDays, restrictionLog: updated.restrictionLog });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    const code = msg === "Forbidden" ? 403 : msg === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
