import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { revokeRentalAccess, grantRentalAccess } from "@/lib/rental-access";
import {
  sendRentalOnboardingEmail,
  sendAccessReadyEmail,
  sendRenewalConfirmation,
  sendPaymentFailedEmail,
  sendAccessRevokedEmail,
  sendTopUpNotification,
  sendTopUpConfirmation,
  sendRentalNotification,
} from "@/services/email";
import Stripe from "stripe";

function getPeriodEnd(subscription: Stripe.Subscription): Date {
  const item = subscription.items?.data?.[0];
  if (item?.current_period_end) {
    return new Date(item.current_period_end * 1000);
  }
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
}

function getSubscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const sub = invoice.parent?.subscription_details?.subscription;
  if (!sub) return null;
  return typeof sub === "string" ? sub : sub.id;
}

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.metadata?.type === "wallet_topup") {
          await handleWalletTopUp(session);
        } else if (session.metadata?.type === "rental_renewal") {
          await handleRentalRenewal(session);
        } else if (session.metadata?.type === "rental_autorenew") {
          await handleAutoRenewSetup(session);
        } else {
          await handleCheckoutCompleted(session);
        }
        break;
      }
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }
    }
  } catch (error) {
    console.error(`Webhook handler error for ${event.type}:`, error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleWalletTopUp(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const amountUsd = Number(session.metadata?.amountUsd);

  if (!userId || !Number.isFinite(amountUsd) || amountUsd <= 0) return;
  if (session.payment_status !== "paid") return;

  // Idempotency: skip if this checkout session has already been credited
  const existing = await prisma.transaction.findFirst({
    where: { description: `stripe_topup:${session.id}` },
  });
  if (existing) return;

  const [updatedUser] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { usdcBalance: { increment: amountUsd } },
      select: { email: true, fullName: true, usdcBalance: true },
    }),
    prisma.transaction.create({
      data: {
        userId,
        type: "deposit",
        amount: amountUsd,
        description: `stripe_topup:${session.id}`,
      },
    }),
  ]);

  // Save the card on file (brand/last4 + payment-method id) so future renewals can
  // charge the shortfall off-session. Stripe vaults the card; we keep only display bits.
  try {
    if (session.payment_intent) {
      const pi = await stripe.paymentIntents.retrieve(
        typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent.id,
        { expand: ["payment_method"] }
      );
      const pm = pi.payment_method;
      if (pm && typeof pm !== "string" && pm.card) {
        await prisma.user.update({
          where: { id: userId },
          data: { stripePaymentMethodId: pm.id, cardBrand: pm.card.brand, cardLast4: pm.card.last4 },
        });
      }
    }
  } catch (e) {
    console.error("Failed to save card on file:", e);
  }

  // Confirm to the customer (non-blocking) — they paid by card, so don't call it USDC.
  try {
    await sendTopUpConfirmation({
      email: updatedUser.email,
      amount: amountUsd,
      method: "card",
      newBalance: Number(updatedUser.usdcBalance),
    });
  } catch (e) {
    console.error("Failed to send top-up confirmation:", e);
  }

  // Notify admin of the new card top-up (non-blocking)
  try {
    await sendTopUpNotification({
      customerEmail: updatedUser.email,
      customerName: updatedUser.fullName,
      amount: amountUsd,
      method: "card",
    });
  } catch (e) {
    console.error("Failed to send top-up notification:", e);
  }
}

// A one-off "renew this rental" payment (from the admin "Send renewal link"). Extends
// the rental's period by a month, marks it active, logs the payment, confirms by email.
async function handleRentalRenewal(session: Stripe.Checkout.Session) {
  const rentalId = session.metadata?.rentalId;
  if (!rentalId || session.payment_status !== "paid") return;

  // Idempotency — don't double-extend if Stripe re-delivers the event.
  const existing = await prisma.transaction.findFirst({
    where: { description: `rental_renewal:${session.id}` },
  });
  if (existing) return;

  const rental = await prisma.rental.findUnique({
    where: { id: rentalId },
    include: { user: true, linkedinAccount: true },
  });
  if (!rental) return;

  // Extend from the later of (current period end, now) + 1 month.
  const base = rental.currentPeriodEnd && rental.currentPeriodEnd > new Date()
    ? new Date(rental.currentPeriodEnd)
    : new Date();
  const nextEnd = new Date(base.getFullYear(), base.getMonth() + 1, base.getDate());
  const price = Number(rental.lockedPrice ?? rental.linkedinAccount.monthlyPrice);

  await prisma.rental.update({
    where: { id: rentalId },
    data: { currentPeriodEnd: nextEnd, status: "active", renewalRemindersSent: [] },
  });
  await prisma.transaction.create({
    data: {
      userId: rental.userId,
      type: "rental_payment",
      amount: -price,
      rentalId,
      description: `rental_renewal:${session.id}`,
    },
  });
  try {
    await sendRenewalConfirmation(rental.user.email);
  } catch (e) {
    console.error("Failed to send renewal confirmation:", e);
  }
}

// Renter set up auto-renew on an EXISTING rental (via the admin "Set up auto-renew" link).
// Attach the new subscription + flip autoRenew on. The subscription's trial_end = the
// already-paid-through date, so it won't charge until then; the trial-end invoice extends
// the period via handlePaymentSucceeded. No double charge for the month already paid.
async function handleAutoRenewSetup(session: Stripe.Checkout.Session) {
  const rentalId = session.metadata?.rentalId;
  const subRef = session.subscription;
  const subscriptionId = typeof subRef === "string" ? subRef : subRef?.id;
  if (!rentalId || !subscriptionId) return;
  const rental = await prisma.rental.findUnique({ where: { id: rentalId } });
  if (!rental) return;
  // If this rental has never had access granted (e.g. an auto-renew link used to sell a NEW
  // account), leave it "pending_access" so the auto-grant cron shares the profile automatically
  // — no manual "Grant" needed. An existing active rental just adding auto-renew stays "active".
  const shares = (rental.gologinShareIds as unknown as unknown[] | null) || [];
  const needsAccess = !rental.accessGrantedAt && shares.length === 0;
  await prisma.rental.update({
    where: { id: rentalId },
    data: {
      stripeSubscriptionId: subscriptionId,
      autoRenew: true,
      // Move the rental fully onto the card rail: Stripe now bills the card monthly, so the
      // rental must leave the wallet-charging cron — otherwise it'd be charged twice (and an
      // empty wallet would wrongly flip it to payment_failed + revoke access).
      usdcPayment: false,
      status: needsAccess ? "pending_access" : "active",
    },
  });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  // Checkout writes the (possibly multi-account) list as a comma-joined string.
  const accountIds = (session.metadata?.linkedinAccountIds || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const subscriptionRef = session.subscription;
  const subscriptionId = typeof subscriptionRef === "string"
    ? subscriptionRef
    : subscriptionRef?.id;

  if (!userId || accountIds.length === 0 || !subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  for (const linkedinAccountId of accountIds) {
    // Per-(subscription, account) idempotency — one subscription can cover several accounts.
    const existing = await prisma.rental.findFirst({
      where: { stripeSubscriptionId: subscriptionId, linkedinAccountId },
    });
    if (existing) continue;

    const account = await prisma.linkedInAccount.findUnique({
      where: { id: linkedinAccountId },
    });
    if (!account) continue;

    // Create the rental, then AUTO-GRANT access on the spot (share the profile to the
    // renter via the right master/klabber token). If the renter hasn't set up GoLogin yet
    // the grant throws -> we leave it pending_access and the auto-grant cron retries.
    const rental = await prisma.rental.create({
      data: {
        userId,
        linkedinAccountId,
        stripeSubscriptionId: subscriptionId,
        currentPeriodEnd: getPeriodEnd(subscription),
        status: "pending_access",
        accessGrantedAt: null,
      },
    });

    await prisma.linkedInAccount.update({
      where: { id: linkedinAccountId },
      data: { status: "rented" },
    });

    let granted = false;
    if (account.gologinProfileId) {
      try {
        await grantRentalAccess(rental.id); // shares to the renter + flips status to active
        granted = true;
      } catch (e) {
        console.error("auto-grant on rental start failed (cron will retry):", rental.id, e instanceof Error ? e.message : e);
      }
    }

    // Granted -> "you're live"; otherwise "we're getting it ready" (cron grants once they set up GoLogin).
    try {
      if (granted) {
        await sendAccessReadyEmail(user.email, account.linkedinName);
      } else {
        await sendRentalOnboardingEmail(user.email, account.linkedinName);
      }
    } catch (e) {
      console.error("Failed to send rental email:", e);
    }

    // Notify admin so they can vet + free the account + grant access.
    try {
      await sendRentalNotification({
        customerEmail: user.email,
        customerName: user.fullName,
        accountName: account.linkedinName,
      });
    } catch (e) {
      console.error("Failed to send rental notification:", e);
    }

    // Remove from waitlist if any
    await prisma.waitlist.deleteMany({ where: { linkedinAccountId } });
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = getSubscriptionIdFromInvoice(invoice);
  if (!subscriptionId) return;

  // Skip the first invoice (handled by checkout.session.completed)
  if (invoice.billing_reason === "subscription_create") return;

  const rental = await prisma.rental.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
    include: { user: true, linkedinAccount: true },
  });
  if (!rental) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  await prisma.rental.update({
    where: { id: rental.id },
    data: {
      currentPeriodEnd: getPeriodEnd(subscription),
      status: "active",
      renewalRemindersSent: [],
    },
  });

  await sendRenewalConfirmation(rental.user.email);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = getSubscriptionIdFromInvoice(invoice);
  if (!subscriptionId) return;

  const rental = await prisma.rental.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
    include: { user: true, linkedinAccount: true },
  });
  if (!rental) return;

  await prisma.rental.update({
    where: { id: rental.id },
    data: { status: "payment_failed" },
  });

  const firstName = (rental.user.fullName || "").trim().split(" ")[0] || "";
  const renewUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://linkedvelocity.com"}/api/rentals/${rental.id}/renew`;
  await sendPaymentFailedEmail(rental.user.email, firstName, renewUrl);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const rental = await prisma.rental.findFirst({
    where: { stripeSubscriptionId: subscription.id },
    include: { user: true, linkedinAccount: true },
  });
  if (!rental) return;

  await prisma.rental.update({
    where: { id: rental.id },
    data: {
      status: "cancelled",
      accessRevokedAt: new Date(),
    },
  });

  // Actually cut GoLogin access (not just the DB status), so a saved share link stops working.
  try {
    await revokeRentalAccess(rental.id);
  } catch (e) {
    console.error("revoke on subscription deleted failed:", rental.id, e);
  }

  // HOLD the account for the reclaim window (don't free it to others yet). The renewals
  // cron releases it + notifies the waitlist once the window passes unpaid.
  const RECLAIM_DAYS = 3;
  const periodEnd = rental.currentPeriodEnd ? new Date(rental.currentPeriodEnd) : new Date();
  const releaseDate = new Date(periodEnd.getTime() + RECLAIM_DAYS * 24 * 60 * 60 * 1000);
  const releaseLabel = releaseDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const firstName = (rental.user.fullName || "").trim().split(" ")[0] || "";
  const renewUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://linkedvelocity.com"}/api/rentals/${rental.id}/renew`;
  await sendAccessRevokedEmail(rental.user.email, firstName, renewUrl, releaseLabel, rental.linkedinAccount.linkedinName);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const rental = await prisma.rental.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });
  if (!rental) return;

  await prisma.rental.update({
    where: { id: rental.id },
    data: {
      autoRenew: !subscription.cancel_at_period_end,
      currentPeriodEnd: getPeriodEnd(subscription),
    },
  });
}
