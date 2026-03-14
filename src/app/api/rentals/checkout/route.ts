import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { requireAuth } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const { accountId } = await req.json();

    const account = await prisma.linkedInAccount.findUnique({
      where: { id: accountId },
    });

    if (!account || account.status !== "available") {
      return NextResponse.json(
        { error: "Account is not available for rental" },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.fullName,
        metadata: { userId: user.id },
      });
      stripeCustomerId = customer.id;
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId },
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID!,
          quantity: 1,
        },
      ],
      metadata: {
        userId: user.id,
        linkedinAccountId: accountId,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          linkedinAccountId: accountId,
        },
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?rental=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/account/${accountId}?rental=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
