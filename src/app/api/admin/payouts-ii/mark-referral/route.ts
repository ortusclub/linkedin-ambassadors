import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { referralCommissionAmount } from "@/lib/referrals";
import { currencyConfig } from "@/lib/referral-currency";

// Record a REFERRAL commission as paid, tied to the specific referred application.
// Creates a commission payout with ambassadorApplicationId set, so the payouts page
// and referrer totals know exactly which referral was paid (no amount-netting guesswork).
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = await req.json().catch(() => ({}));
    const applicationId: string = body.applicationId;
    if (!applicationId || typeof applicationId !== "string") {
      return NextResponse.json({ error: "applicationId required" }, { status: 400 });
    }

    const app = await prisma.ambassadorApplication.findUnique({
      where: { id: applicationId },
      select: { fullName: true, referredBy: true, referralSource: true, status: true, onboardingMethod: true, onboardingVerified: true, onboardedAt: true, verifiedAt: true },
    });
    if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });
    const slug = (app.referredBy || "").trim();
    if (!slug) return NextResponse.json({ error: "This application has no referrer." }, { status: 400 });

    const referrer = await prisma.referrer.findFirst({
      where: { OR: [{ slug: { equals: slug, mode: "insensitive" } }, { name: { equals: slug, mode: "insensitive" } }] },
      select: { id: true, slug: true },
    });
    if (!referrer) return NextResponse.json({ error: `Referrer "${slug}" not found.` }, { status: 404 });

    // Already recorded? Don't double-pay the same referral.
    const existing = await prisma.payout.findFirst({
      where: { type: "commission", ambassadorApplicationId: applicationId, paidAt: { not: null } },
      select: { id: true },
    });
    if (existing) return NextResponse.json({ ok: true, alreadyPaid: true });

    const cfg = currencyConfig(referrer.slug);
    const amount = referralCommissionAmount(
      { status: app.status, referralSource: app.referralSource, onboardingMethod: app.onboardingMethod, onboardingVerified: app.onboardingVerified, onboardedAt: app.onboardedAt, verifiedAt: app.verifiedAt },
      cfg.referralTiers,
    );

    const payout = await prisma.payout.create({
      data: {
        referrerId: referrer.id,
        type: "commission",
        ambassadorApplicationId: applicationId,
        amount,
        description: `Commission for ${app.fullName}`,
        paidAt: new Date(),
        paidBy: admin.fullName || admin.email,
      },
    });
    return NextResponse.json({ ok: true, payout: { id: payout.id, amount: Number(payout.amount) } }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && (error.message === "Forbidden" || error.message === "Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
