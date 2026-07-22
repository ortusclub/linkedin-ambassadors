import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function authError(error: unknown) {
  if (error instanceof Error && (error.message === "Forbidden" || error.message === "Unauthorized")) {
    return NextResponse.json({ error: error.message }, { status: error.message === "Forbidden" ? 403 : 401 });
  }
  return null;
}

// List every payout with its referrer, newest first.
export async function GET() {
  try {
    await requireAdmin();
    const payouts = await prisma.payout.findMany({
      orderBy: { createdAt: "desc" },
      include: { referrer: { select: { id: true, name: true, slug: true, paymentMethod: true, paymentDetails: true } } },
    });
    return NextResponse.json({
      payouts: payouts.map((p) => ({ ...p, amount: Number(p.amount) })),
    });
  } catch (error) {
    return authError(error) ?? NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Create a payout owed to a marketer. Created unpaid — "paid" is a separate,
// deliberate step so a row can't quietly appear as already settled.
export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();

    const referrerId = String(body.referrerId || "");
    const amount = Number(body.amount);
    if (!referrerId) return NextResponse.json({ error: "Pick who this is for" }, { status: 400 });
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Enter an amount greater than zero" }, { status: 400 });
    }

    const referrer = await prisma.referrer.findUnique({ where: { id: referrerId } });
    if (!referrer) return NextResponse.json({ error: "Unknown marketer" }, { status: 404 });

    const payout = await prisma.payout.create({
      data: {
        referrerId,
        type: typeof body.type === "string" && body.type ? body.type : "day_rate",
        description: typeof body.description === "string" ? body.description : null,
        amount,
        note: typeof body.note === "string" ? body.note : null,
      },
    });
    return NextResponse.json({ payout: { ...payout, amount: Number(payout.amount) } }, { status: 201 });
  } catch (error) {
    return authError(error) ?? NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
