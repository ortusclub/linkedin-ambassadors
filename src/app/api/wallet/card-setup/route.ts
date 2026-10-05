import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Save a card on file WITHOUT charging it (Stripe Checkout in setup mode), so a renter can
// turn on auto-recharge without first doing a top-up. The chosen auto-recharge settings ride
// along in metadata; the webhook saves the card AND applies them when setup completes.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { threshold?: number; amount?: number; enable?: boolean } = {};
  try { body = await req.json(); } catch { /* no settings — just save a card */ }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, email: true, stripeCustomerId: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email, metadata: { userId: user.id } });
    customerId = customer.id;
    await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
  }

  const origin = req.headers.get("origin") || "https://linkedvelocity.com";
  const threshold = Number(body.threshold);
  const amount = Number(body.amount);

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "setup",
    customer: customerId,
    payment_method_types: ["card"],
    metadata: {
      userId: user.id,
      type: "card_setup",
      // Apply these when the card saves, so one trip enables auto-recharge end to end.
      enableAutoRecharge: body.enable ? "1" : "0",
      threshold: Number.isFinite(threshold) && threshold > 0 ? String(threshold) : "",
      amount: Number.isFinite(amount) && amount > 0 ? String(amount) : "",
    },
    success_url: `${origin}/dashboard?card=saved`,
    cancel_url: `${origin}/dashboard?card=cancelled`,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
