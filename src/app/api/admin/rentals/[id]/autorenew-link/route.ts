import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { requireAdmin } from "@/lib/auth";

// Create a Stripe SUBSCRIPTION checkout link to put an EXISTING rental onto auto-renew.
// - Bills monthly at the rental's locked/listed price (honours grandfathered prices).
// - trial_end = the current paid-through date, so the renter is NOT double-charged for the
//   month they've already paid; the first real charge lands when that period ends.
// On completion the webhook (type "rental_autorenew") attaches the subscription + flips
// autoRenew on; thereafter invoice.payment_succeeded auto-extends the rental each month.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;

    const rental = await prisma.rental.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, fullName: true, stripeCustomerId: true } },
        linkedinAccount: { select: { linkedinName: true, monthlyPrice: true } },
      },
    });
    if (!rental) return NextResponse.json({ error: "Rental not found" }, { status: 404 });
    if (rental.stripeSubscriptionId) {
      return NextResponse.json({ error: "This rental already has a subscription / auto-renew set up." }, { status: 400 });
    }

    const price = Number(rental.lockedPrice ?? rental.linkedinAccount.monthlyPrice);
    if (!price || price <= 0) {
      return NextResponse.json({ error: "This account has no monthly price set." }, { status: 400 });
    }

    let stripeCustomerId = rental.user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: rental.user.email,
        name: rental.user.fullName,
        metadata: { userId: rental.user.id },
      });
      stripeCustomerId = customer.id;
      await prisma.user.update({ where: { id: rental.user.id }, data: { stripeCustomerId } });
    }

    // Defer the first charge until the already-paid period ends (avoids double-charging).
    // Stripe requires trial_end to be >= 48h in the future — so only defer when the paid-through
    // date is genuinely >2 days out. If the period is near-lapsed/past (e.g. renter let it run
    // down), skip the trial and bill on checkout — there's no paid period left to double-charge.
    const nowSec = Math.floor(Date.now() / 1000);
    const periodEndSec = rental.currentPeriodEnd ? Math.floor(new Date(rental.currentPeriodEnd).getTime() / 1000) : 0;
    const minTrialSec = nowSec + 2 * 86400 + 3600; // 48h + 1h buffer
    const trialEnd = periodEndSec > minTrialSec ? periodEndSec : undefined;

    const meta = { type: "rental_autorenew", rentalId: rental.id, userId: rental.user.id };

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: { name: `LinkedVelocity rental — ${rental.linkedinAccount.linkedinName} (monthly, auto-renew)` },
          unit_amount: Math.round(price * 100),
          recurring: { interval: "month" },
        },
        quantity: 1,
      }],
      metadata: meta,
      subscription_data: { metadata: meta, ...(trialEnd ? { trial_end: trialEnd } : {}) },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?autorenew=on`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    });

    if (!session.url) return NextResponse.json({ error: "Stripe did not return a URL" }, { status: 500 });
    return NextResponse.json({ ok: true, url: session.url, price });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    if (msg === "Forbidden" || msg === "Unauthorized") {
      return NextResponse.json({ error: msg }, { status: msg === "Forbidden" ? 403 : 401 });
    }
    console.error("Auto-renew link error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
