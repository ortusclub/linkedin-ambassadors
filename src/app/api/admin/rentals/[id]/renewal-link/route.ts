import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { requireAdmin } from "@/lib/auth";
import { sendRenewalLinkEmail } from "@/services/email";

// Create a one-off Stripe payment link for a rental's next month and email it to
// the renter (a "renews soon, pay here" reminder). On payment, the Stripe webhook
// extends the rental (metadata.type === "rental_renewal"). Reusable for any rental;
// built for manikaran's manual Jul 9 renewal (he has no Stripe subscription).
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const price = Number(rental.linkedinAccount.monthlyPrice);
    if (!price || price <= 0) {
      return NextResponse.json({ error: "This account has no monthly price set." }, { status: 400 });
    }

    // Get or create the renter's Stripe customer.
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

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: { name: `LinkedVelocity rental — ${rental.linkedinAccount.linkedinName} (1 month)` },
          unit_amount: Math.round(price * 100),
        },
        quantity: 1,
      }],
      metadata: { type: "rental_renewal", rentalId: rental.id },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?rental=renewed`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    });

    if (!session.url) {
      return NextResponse.json({ error: "Stripe did not return a payment URL" }, { status: 500 });
    }

    const dueDate = rental.currentPeriodEnd
      ? new Date(rental.currentPeriodEnd).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
      : "your renewal date";

    const firstName = (rental.user.fullName || "").trim().split(" ")[0] || "";
    await sendRenewalLinkEmail(
      rental.user.email,
      firstName,
      rental.linkedinAccount.linkedinName,
      session.url,
      dueDate,
      `$${price.toFixed(0)}`,
    );

    return NextResponse.json({ ok: true, sentTo: rental.user.email, url: session.url });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    if (msg === "Forbidden" || msg === "Unauthorized") {
      return NextResponse.json({ error: msg }, { status: msg === "Forbidden" ? 403 : 401 });
    }
    console.error("Renewal link error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
