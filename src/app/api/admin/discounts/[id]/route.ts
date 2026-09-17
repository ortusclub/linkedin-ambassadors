import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";

// Enable/disable a discount code. Stripe promotion codes can't be deleted, only
// deactivated — flipping `active` stops it working at checkout while keeping the
// redemption history, and the toggle is fully reversible (the coupon is untouched).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const active = !!body.active;

    const promo = await stripe.promotionCodes.update(id, { active });
    return NextResponse.json({ ok: true, active: promo.active });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const message =
      error instanceof Stripe.errors.StripeError ? error.message : "Could not update discount code";
    console.error("Update discount error:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
