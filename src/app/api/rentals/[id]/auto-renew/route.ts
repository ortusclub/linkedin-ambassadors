import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { requireAuth } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const { autoRenew } = await req.json();
    const on = !!autoRenew;

    const rental = await prisma.rental.findFirst({
      where: { id, userId: user.id, status: "active" },
    });

    if (!rental) {
      return NextResponse.json({ error: "Rental not found" }, { status: 404 });
    }

    // Keep Stripe in sync: auto-renew OFF => stop billing at period end (they keep
    // access until then); ON => resume. No Stripe sub = wallet/manual rental, where
    // the renewals cron honours the autoRenew flag instead.
    if (rental.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.update(rental.stripeSubscriptionId, {
          cancel_at_period_end: !on,
        });
      } catch (e) {
        console.error("Stripe auto-renew sync failed:", e);
        return NextResponse.json({ error: "Couldn't update billing — please try again." }, { status: 502 });
      }
    }

    await prisma.rental.update({
      where: { id },
      data: { autoRenew: on },
    });

    return NextResponse.json({ ok: true, autoRenew: on });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
