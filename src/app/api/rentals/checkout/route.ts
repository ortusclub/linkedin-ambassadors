import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { requireAuth } from "@/lib/auth";
import { SALES_NAV_MONTHLY } from "@/lib/utils";

// Direct Stripe checkout for a rental. Instead of topping up a wallet first, the
// renter pays by card here and Stripe drives the monthly subscription (renewal +
// dunning) from then on. Per-account pricing (base + optional Sales Navigator) is
// billed via inline price_data, and Stripe's promotion-code box is enabled so any
// discount code created in /admin/discounts applies at checkout.
export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const body = await req.json();

    // Support both single accountId and an array of accountIds.
    const accountIds: string[] = body.accountIds
      ? body.accountIds
      : body.accountId
        ? [body.accountId]
        : [];

    if (accountIds.length === 0) {
      return NextResponse.json({ error: "No accounts selected" }, { status: 400 });
    }

    // Accounts the renter chose to add Sales Navigator to (+$70/mo each). Only
    // honoured for accounts that don't already include it.
    const salesNavSet = new Set<string>(
      Array.isArray(body.salesNavAccountIds) ? body.salesNavAccountIds : []
    );
    const autoRenew = body.autoRenew !== false; // default on

    const accounts = await prisma.linkedInAccount.findMany({
      where: { id: { in: accountIds }, status: "available" },
    });

    if (accounts.length === 0) {
      return NextResponse.json(
        { error: "No selected accounts are available for rental" },
        { status: 400 }
      );
    }

    // Get or create the Stripe customer.
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

    // Effective monthly charge per account = base price + Sales Nav add-on (if chosen
    // and not already included). This is the amount we bill AND lock in for renewals.
    const addonFor = (a: (typeof accounts)[number]) =>
      salesNavSet.has(a.id) && !a.hasSalesNav ? SALES_NAV_MONTHLY : 0;
    const priceFor = (a: (typeof accounts)[number]) =>
      Number(a.monthlyPrice) + addonFor(a);

    const line_items = accounts.map((a) => {
      const withSalesNav = addonFor(a) > 0;
      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: `LinkedVelocity — ${a.linkedinName}${withSalesNav ? " (+ Sales Navigator)" : ""}`,
          },
          unit_amount: Math.round(priceFor(a) * 100),
          recurring: { interval: "month" as const },
        },
        quantity: 1,
      };
    });

    // Encode per-account effective prices + Sales Nav flags so the webhook can lock
    // each rental's rate and note the add-on. Kept compact to stay within Stripe's
    // 500-char metadata value limit (a handful of accounts per order in practice).
    const priceMap = accounts.map((a) => `${a.id}:${priceFor(a)}`).join(",");
    const salesNavList = accounts.filter((a) => addonFor(a) > 0).map((a) => a.id).join(",");

    const metadata = {
      userId: user.id,
      linkedinAccountIds: accounts.map((a) => a.id).join(","),
      priceMap,
      salesNavIds: salesNavList,
      autoRenew: autoRenew ? "1" : "0",
    };

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      allow_promotion_codes: true,
      line_items,
      metadata,
      subscription_data: { metadata },
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
