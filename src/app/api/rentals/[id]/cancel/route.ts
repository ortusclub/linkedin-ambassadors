import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { requireAuth } from "@/lib/auth";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const rental = await prisma.rental.findFirst({
      where: { id, userId: user.id, status: "active" },
    });

    if (!rental) {
      return NextResponse.json({ error: "Rental not found" }, { status: 404 });
    }

    // "Cancel renewal" = stop billing, but the renter KEEPS access until the end of the
    // period they already paid for. Don't cancel/revoke immediately.
    //  - Card (Stripe sub): set cancel_at_period_end; Stripe stops at period end and
    //    fires customer.subscription.deleted, which revokes access + frees the account.
    //  - Wallet/manual: the renewals cron expires + revokes it at period end.
    if (rental.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.update(rental.stripeSubscriptionId, {
          cancel_at_period_end: true,
        });
      } catch (e) {
        console.error("Stripe cancel-at-period-end error:", e);
        return NextResponse.json({ error: "Couldn't cancel renewal — please try again." }, { status: 502 });
      }
    }

    await prisma.rental.update({
      where: { id },
      data: { autoRenew: false },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
