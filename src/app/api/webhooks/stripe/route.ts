import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import {
  sendWelcomeEmail,
  sendRenewalConfirmation,
  sendPaymentFailedEmail,
  sendAccessRevokedEmail,
  sendAccountAvailableEmail,
  sendTopUpNotification,
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

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { usdcBalance: { increment: amountUsd } },
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

  // Notify admin of the new card top-up (non-blocking)
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, fullName: true },
    });
    if (user) {
      await sendTopUpNotification({
        customerEmail: user.email,
        customerName: user.fullName,
        amount: amountUsd,
        method: "card",
      });
    }
  } catch (e) {
    console.error("Failed to send top-up notification:", e);
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const linkedinAccountId = session.metadata?.linkedinAccountId;
  const subscriptionRef = session.subscription;
  const subscriptionId = typeof subscriptionRef === "string"
    ? subscriptionRef
    : subscriptionRef?.id;

  if (!userId || !linkedinAccountId || !subscriptionId) return;

  // Idempotency: check if rental already exists
  const existing = await prisma.rental.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  });
  if (existing) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  await prisma.rental.create({
    data: {
      userId,
      linkedinAccountId,
      stripeSubscriptionId: subscriptionId,
      currentPeriodEnd: getPeriodEnd(subscription),
      accessGrantedAt: new Date(),
    },
  });

  await prisma.linkedInAccount.update({
    where: { id: linkedinAccountId },
    data: { status: "rented" },
  });

  // Send welcome email
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const account = await prisma.linkedInAccount.findUnique({
    where: { id: linkedinAccountId },
  });

  if (user && account) {
    const instructions = account.gologinProfileId
      ? `1. Download GoLogin (free plan) from gologin.com\n2. Log in with the email: ${user.email}\n3. You'll find the shared profile in your GoLogin dashboard\n4. Click "Start" to launch the browser with LinkedIn already logged in.`
      : "Access instructions will be provided by our team shortly.";

    await sendWelcomeEmail(user.email, account.linkedinName, instructions);

    // Notify admin of the new rental (non-blocking)
    try {
      await sendRentalNotification({
        customerEmail: user.email,
        customerName: user.fullName,
        accountName: account.linkedinName,
      });
    } catch (e) {
      console.error("Failed to send rental notification:", e);
    }
  }

  // Remove from waitlist if any
  await prisma.waitlist.deleteMany({ where: { linkedinAccountId } });
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
    },
  });

  await sendRenewalConfirmation(
    rental.user.email,
    rental.linkedinAccount.linkedinName
  );
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

  await sendPaymentFailedEmail(
    rental.user.email,
    rental.linkedinAccount.linkedinName
  );
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

  await prisma.linkedInAccount.update({
    where: { id: rental.linkedinAccountId },
    data: { status: "available" },
  });

  await sendAccessRevokedEmail(
    rental.user.email,
    rental.linkedinAccount.linkedinName
  );

  // Notify waitlist users
  const waitlistEntries = await prisma.waitlist.findMany({
    where: { linkedinAccountId: rental.linkedinAccountId },
    include: { user: true },
  });
  for (const entry of waitlistEntries) {
    await sendAccountAvailableEmail(
      entry.user.email,
      rental.linkedinAccount.linkedinName
    );
  }
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
