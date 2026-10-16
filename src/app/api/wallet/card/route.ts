import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveViewUser } from "@/lib/view-as";

// Returns the card on file (brand + last4) for display on the dashboard.
export async function GET(req: NextRequest) {
  let viewUser;
  try {
    viewUser = (await resolveViewUser(req)).user; // admin ?view_as=<id> sees the renter's card (read-only)
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: viewUser.id },
    select: { cardBrand: true, cardLast4: true, stripePaymentMethodId: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({
    card: user.stripePaymentMethodId && user.cardLast4
      ? { brand: user.cardBrand, last4: user.cardLast4 }
      : null,
  });
}

// Remove the card on file: detach it from the Stripe customer and clear our display fields.
export async function DELETE() {
  const session = await getSession();
  if (!session?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, stripePaymentMethodId: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (user.stripePaymentMethodId) {
    try {
      await stripe.paymentMethods.detach(user.stripePaymentMethodId);
    } catch (e) {
      // If it's already detached/invalid, still clear our record.
      console.error("Detach payment method failed:", e);
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { stripePaymentMethodId: null, cardBrand: null, cardLast4: null },
  });

  return NextResponse.json({ ok: true });
}
