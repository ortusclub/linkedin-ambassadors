import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MIN_THRESHOLD = 5;
const MIN_AMOUNT = 10;
const MAX_AMOUNT = 10000;

export async function GET() {
  const session = await getSession();
  if (!session?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      autoRechargeEnabled: true, autoRechargeThreshold: true, autoRechargeAmount: true,
      cardBrand: true, cardLast4: true, stripePaymentMethodId: true, usdcBalance: true,
    },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({
    enabled: user.autoRechargeEnabled,
    threshold: user.autoRechargeThreshold != null ? Number(user.autoRechargeThreshold) : null,
    amount: user.autoRechargeAmount != null ? Number(user.autoRechargeAmount) : null,
    balance: Number(user.usdcBalance),
    card: user.stripePaymentMethodId && user.cardLast4 ? { brand: user.cardBrand, last4: user.cardLast4 } : null,
  });
}

// Update auto-recharge settings. Turning it ON requires a card on file (consent to auto
// charges); if there's no card, the client should send the renter through /api/wallet/card-setup.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const enabled = !!body.enabled;
  const threshold = Number(body.threshold);
  const amount = Number(body.amount);

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, stripePaymentMethodId: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (enabled) {
    if (!user.stripePaymentMethodId) {
      return NextResponse.json({ error: "Add a card first.", needsCard: true }, { status: 400 });
    }
    if (!Number.isFinite(threshold) || threshold < MIN_THRESHOLD) {
      return NextResponse.json({ error: `Threshold must be at least $${MIN_THRESHOLD}.` }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
      return NextResponse.json({ error: `Recharge amount must be between $${MIN_AMOUNT} and $${MAX_AMOUNT}.` }, { status: 400 });
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: enabled
      ? { autoRechargeEnabled: true, autoRechargeThreshold: threshold, autoRechargeAmount: amount }
      : { autoRechargeEnabled: false },
  });

  return NextResponse.json({ ok: true, enabled });
}
