import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import type { RestrictionEvent } from "@/lib/restriction";

// Status-strip state changes that aren't a restrict/recover (those go through /restricted so the
// downtime-credit + billing-paused logic stays in one place). Handles:
//   perm      → permanently restricted / retired
//   withdrawn → taken off the market (unavailable)
//   clear     → undo perm/withdrawn back toward active (caller then lists it via the gated PATCH)
// Every change is written to the account's restriction history with who + when.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const { state } = (await req.json()) as { state?: string };
    const who = admin.fullName || admin.email;
    const account = await prisma.linkedInAccount.findUnique({ where: { id }, select: { restrictionLog: true } });
    if (!account) return NextResponse.json({ error: "not found" }, { status: 404 });

    const log: RestrictionEvent[] = Array.isArray(account.restrictionLog) ? (account.restrictionLog as RestrictionEvent[]) : [];
    const at = new Date().toISOString();
    const append = (event: "restricted" | "recovered", note: string) => [...log, { at, event, note } as RestrictionEvent];

    let data: Record<string, unknown>;
    if (state === "perm") {
      data = { permanentlyRestricted: true, status: "retired", restrictionLog: append("restricted", `Perm. restricted · set by ${who}`) };
    } else if (state === "withdrawn") {
      data = { status: "unavailable", restrictionLog: append("recovered", `Withdrawn · set by ${who}`) };
    } else if (state === "clear") {
      // Undo perm/withdrawn. Leaves status "unavailable" (not listed) — caller lists it with the
      // gated PATCH → available once rental-ready passes. healthCheckedAt bumped like Mark active.
      data = { permanentlyRestricted: false, status: "unavailable", linkedinAccountHealth: "active", healthCheckedAt: new Date(), restrictionLog: append("recovered", `Marked active by ${who}`) };
    } else {
      return NextResponse.json({ error: "unknown state" }, { status: 400 });
    }

    await prisma.linkedInAccount.update({ where: { id }, data });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    const code = msg === "Forbidden" ? 403 : msg === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
