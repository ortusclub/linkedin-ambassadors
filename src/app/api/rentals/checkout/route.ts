import { monthlyRentalPrice } from "@/lib/account-pricing";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { requireAuth } from "@/lib/auth";
import { baseUrlFromRequest, brandFromRequest } from "@/lib/brand";

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    // Return to the SAME domain the checkout was started on, so a linkedarmy.com
    // customer lands back on linkedarmy.com (not the LinkedVelocity fallback).
    const baseUrl = baseUrlFromRequest(req);
    const brand = brandFromRequest(req);
    // What the payer sees on the Stripe line item — brand-correct, no cross-brand leak.
    const lineItemName = brand.id === "linkedarmy" ? "LinkedArmy — LinkedIn Ambassador" : "LinkedVelocity account rental";

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
      // A restricted (recovering) or 2FA-reset-needed account keeps status "available"
      // but must not be rentable — exclude it so checkout can't grab one.
      where: { id: { in: accountIds }, status: "available", listed: true, inventoryPool: { notIn: ["ortus", "apex"] }, restrictedAt: null, twoFactorResetNeeded: false },
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
      allow_promotion_codes: true,
      line_items: accounts.map((a) => ({
        price_data: { currency: "usd", unit_amount: monthlyRentalPrice(a) * 100, recurring: { interval: "month" }, product_data: { name: lineItemName } },
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
      success_url: `${baseUrl}/dashboard?rental=success`,
      cancel_url: `${baseUrl}/catalogue?rental=cancelled`,
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
