import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MIN_TOPUP_USD = 10;
const MAX_TOPUP_USD = 10000;

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { amount?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount < MIN_TOPUP_USD || amount > MAX_TOPUP_USD) {
    return NextResponse.json(
      { error: `Amount must be between $${MIN_TOPUP_USD} and $${MAX_TOPUP_USD}` },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, email: true, stripeCustomerId: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const origin = req.headers.get("origin") || "https://linkedvelocity.com";
  const amountCents = Math.round(amount * 100);

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `LinkedVelocity Balance Top-Up — $${amount.toFixed(2)} USDC`,
            description: "Adds USDC to your LinkedVelocity wallet balance.",
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      userId: user.id,
      type: "wallet_topup",
      amountUsd: amount.toFixed(2),
    },
    payment_intent_data: {
      metadata: {
        userId: user.id,
        type: "wallet_topup",
        amountUsd: amount.toFixed(2),
      },
    },
    success_url: `${origin}/dashboard?topup=success`,
    cancel_url: `${origin}/dashboard?topup=cancelled`,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
