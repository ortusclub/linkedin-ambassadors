import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function authError(error: unknown) {
  if (error instanceof Error && (error.message === "Forbidden" || error.message === "Unauthorized")) {
    return NextResponse.json({ error: error.message }, { status: error.message === "Forbidden" ? 403 : 401 });
  }
  return null;
}

// Mark a payout as sent (method + reference + who paid), or edit/undo it.
// Note we never set confirmedAt here — only the marketer's own portal can do that,
// otherwise the confirmation would be worthless as evidence.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.payout.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data: Record<string, unknown> = {};
    if ("markPaid" in body) {
      data.paidAt = body.markPaid ? new Date() : null;
      // Undoing "paid" drops the marketer's confirmation too — a confirmation of a
      // payment that no longer exists would be misleading in the audit trail.
      if (!body.markPaid) {
        data.confirmedAt = null;
        data.confirmedBy = null;
      }
    }
    for (const key of ["method", "reference", "paidBy", "description", "note", "type"] as const) {
      if (key in body) data[key] = typeof body[key] === "string" ? body[key] : null;
    }
    if ("amount" in body) {
      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json({ error: "Enter an amount greater than zero" }, { status: 400 });
      }
      data.amount = amount;
    }

    const payout = await prisma.payout.update({ where: { id }, data });
    return NextResponse.json({ payout: { ...payout, amount: Number(payout.amount) } });
  } catch (error) {
    return authError(error) ?? NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    await prisma.payout.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authError(error) ?? NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
