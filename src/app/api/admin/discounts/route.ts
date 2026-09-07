import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";

// Discount codes are stored in Stripe (a Coupon defines the discount; a Promotion Code
// is the customer-facing string tied to it). Checkout has allow_promotion_codes enabled,
// so any code created here works at checkout immediately — no DB table needed.

function serialize(pc: Stripe.PromotionCode) {
  // In this Stripe API version the coupon lives under promotion.coupon (expanded).
  const coupon = pc.promotion?.coupon;
  const c = coupon && typeof coupon !== "string" ? coupon : null;
  return {
    id: pc.id,
    code: pc.code,
    active: pc.active,
    timesRedeemed: pc.times_redeemed,
    maxRedemptions: pc.max_redemptions,
    expiresAt: pc.expires_at,
    created: pc.created,
    discountType: c?.percent_off != null ? "percent" : "fixed",
    percentOff: c?.percent_off ?? null,
    amountOff: c?.amount_off != null ? c.amount_off / 100 : null,
    currency: c?.currency ?? null,
    duration: c?.duration ?? null,
    durationInMonths: c?.duration_in_months ?? null,
    couponValid: c?.valid ?? false,
  };
}

export async function GET() {
  try {
    await requireAdmin();
    const codes = await stripe.promotionCodes.list({ limit: 100, expand: ["data.promotion.coupon"] });
    return NextResponse.json({ codes: codes.data.map(serialize) });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("List discounts error:", error);
    return NextResponse.json({ error: "Could not load discount codes" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();

    const code: string = (body.code || "").toString().trim().toUpperCase();
    const discountType: string = body.discountType === "fixed" ? "fixed" : "percent";
    const value = Number(body.value);
    const duration: string = ["once", "forever", "repeating"].includes(body.duration)
      ? body.duration
      : "once";
    const durationInMonths = Number(body.durationInMonths);
    const maxRedemptions = Number(body.maxRedemptions);
    const expiresAt: string | undefined = body.expiresAt; // yyyy-mm-dd

    if (!code || !/^[A-Z0-9_-]{3,40}$/.test(code)) {
      return NextResponse.json(
        { error: "Code must be 3–40 characters: letters, numbers, - or _." },
        { status: 400 }
      );
    }
    if (!Number.isFinite(value) || value <= 0) {
      return NextResponse.json({ error: "Enter a discount amount greater than 0." }, { status: 400 });
    }
    if (discountType === "percent" && value > 100) {
      return NextResponse.json({ error: "Percentage cannot exceed 100." }, { status: 400 });
    }

    // Build the coupon (the discount definition).
    const couponParams: Stripe.CouponCreateParams = {
      name: code,
      duration: duration as Stripe.CouponCreateParams.Duration,
    };
    if (discountType === "percent") {
      couponParams.percent_off = value;
    } else {
      couponParams.amount_off = Math.round(value * 100);
      couponParams.currency = "usd";
    }
    if (duration === "repeating") {
      if (!Number.isFinite(durationInMonths) || durationInMonths < 1) {
        return NextResponse.json(
          { error: "For a repeating discount, set how many months it lasts." },
          { status: 400 }
        );
      }
      couponParams.duration_in_months = Math.round(durationInMonths);
    }

    const coupon = await stripe.coupons.create(couponParams);

    // Build the customer-facing promotion code tied to that coupon.
    const pcParams: Stripe.PromotionCodeCreateParams = {
      promotion: { type: "coupon", coupon: coupon.id },
      code,
    };
    if (Number.isFinite(maxRedemptions) && maxRedemptions > 0) {
      pcParams.max_redemptions = Math.round(maxRedemptions);
    }
    if (expiresAt) {
      const ts = Math.floor(new Date(`${expiresAt}T23:59:59`).getTime() / 1000);
      if (Number.isFinite(ts) && ts > Date.now() / 1000) pcParams.expires_at = ts;
    }

    const promo = await stripe.promotionCodes.create({ ...pcParams, expand: ["promotion.coupon"] });
    return NextResponse.json({ code: serialize(promo) });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Surface Stripe's own message (e.g. duplicate code) so the admin can fix it.
    const message =
      error instanceof Stripe.errors.StripeError ? error.message : "Could not create discount code";
    console.error("Create discount error:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
