import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { requireAuth } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const body = await req.json();

    // Support both single accountId and array of accountIds
    const accountIds: string[] = body.accountIds
      ? body.accountIds
      : body.accountId
        ? [body.accountId]
        : [];

    if (accountIds.length === 0) {
      return NextResponse.json({ error: "No accounts selected" }, { status: 400 });
    }

    const accounts = await prisma.linkedInAccount.findMany({
      where: { id: { in: accountIds }, status: "available" },
    });

    if (accounts.length === 0) {
      return NextResponse.json(
        { error: "No selected accounts are available for rental" },
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
      line_items: accounts.map(() => ({
        price: process.env.STRIPE_PRICE_ID!,
        quantity: 1,
      })),
      metadata: {
        userId: user.id,
        linkedinAccountIds: accounts.map((a) => a.id).join(","),
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          linkedinAccountIds: accounts.map((a) => a.id).join(","),
        },
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?rental=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/catalogue?rental=cancelled`,
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
