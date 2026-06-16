import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

// Public "renew this rental" link used by the renewal-cadence emails. Clicking it
// creates a fresh Stripe Checkout payment session and redirects to it — so the link
// in an email never expires (the session is made on click, not when the email is sent).
// Identified by rental id only: it merely lets the renter pay; nothing sensitive is exposed.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://linkedvelocity.com";

  const rental = await prisma.rental.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, fullName: true, stripeCustomerId: true } },
      linkedinAccount: { select: { linkedinName: true, monthlyPrice: true } },
    },
  });
  if (!rental) return NextResponse.redirect(`${appUrl}/dashboard`);

  const price = Number(rental.linkedinAccount.monthlyPrice);
  if (!price || price <= 0) return NextResponse.redirect(`${appUrl}/dashboard`);

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
    success_url: `${appUrl}/dashboard?rental=renewed`,
    cancel_url: `${appUrl}/dashboard`,
  });

  return NextResponse.redirect(session.url || `${appUrl}/dashboard`);
}
