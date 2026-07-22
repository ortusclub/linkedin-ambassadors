import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// The marketer acknowledging, from their own portal link, that they received a
// payment. This is the evidence half of a cash payout — we record WHO confirmed
// (the name they type), and when. Confirmation is one-way and can't be undone
// from here: a marketer must never be able to un-say they were paid, and we must
// never be able to silently mark it for them (admin sets paid, marketer confirms).
export async function POST(req: Request, { params }: { params: Promise<{ token: string; id: string }> }) {
  const { token, id } = await params;

  const me = await prisma.referrer.findUnique({ where: { token } });
  if (!me) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Scope the lookup to this referrer so one token can't confirm another's payout.
  const payout = await prisma.payout.findFirst({ where: { id, referrerId: me.id } });
  if (!payout) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!payout.paidAt) {
    return NextResponse.json(
      { error: "This payment hasn't been sent yet — nothing to confirm." },
      { status: 400 }
    );
  }
  if (payout.confirmedAt) {
    return NextResponse.json({ ok: true, alreadyConfirmed: true, confirmedAt: payout.confirmedAt });
  }

  const body = await req.json().catch(() => ({}));
  const typedName = typeof body.confirmedBy === "string" ? body.confirmedBy.trim().slice(0, 120) : "";
  if (!typedName) {
    return NextResponse.json({ error: "Please type your name to confirm." }, { status: 400 });
  }

  const updated = await prisma.payout.update({
    where: { id: payout.id },
    data: { confirmedAt: new Date(), confirmedBy: typedName },
  });

  return NextResponse.json({ ok: true, confirmedAt: updated.confirmedAt, confirmedBy: updated.confirmedBy });
}
