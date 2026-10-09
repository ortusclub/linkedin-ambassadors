import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { monthlyRentalPrice } from "@/lib/account-pricing";
import { maskPublicAccount } from "@/lib/mask";
import { canReplaceNow, replacementUnlockAt } from "@/lib/replacement";

// Accounts a renter may swap a RESTRICTED rental to: genuinely-available inventory priced at
// the same tier or lower than the restricted one (they keep their original locked price, so
// they never pay more). Only offered once the 2-day recovery hold has elapsed.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const rental = await prisma.rental.findFirst({
      where: { id, userId: user.id, isShadow: false },
      select: {
        id: true,
        status: true,
        linkedinAccount: {
          select: {
            id: true, restrictedAt: true,
            connectionCount: true, accountAgeMonths: true, hasSalesNav: true, linkedinVerified: true,
          },
        },
      },
    });

    if (!rental) return NextResponse.json({ error: "Rental not found" }, { status: 404 });
    const acct = rental.linkedinAccount;
    if (!acct.restrictedAt) {
      return NextResponse.json({ error: "This account isn't restricted, so it can't be replaced." }, { status: 400 });
    }
    if (!canReplaceNow(acct.restrictedAt)) {
      return NextResponse.json(
        { error: "We're still trying to recover this account. Replacement unlocks after the recovery window.", unlockAt: replacementUnlockAt(acct.restrictedAt) },
        { status: 409 }
      );
    }

    const oldPrice = monthlyRentalPrice(acct);

    // Genuinely-rentable inventory only (mirror the catalogue's "available" branch), minus
    // the restricted account itself.
    const candidates = await prisma.linkedInAccount.findMany({
      where: {
        id: { not: acct.id },
        status: "available", listed: true, restrictedAt: null, twoFactorResetNeeded: false,
        inventoryPool: { notIn: ["ortus", "apex"] },
      },
      select: {
        id: true, linkedinName: true, linkedinHeadline: true, linkedinUrl: true,
        connectionCount: true, industry: true, location: true, profilePhotoUrl: true,
        accountAgeMonths: true, hasSalesNav: true, linkedinVerified: true, notes: true,
      },
      orderBy: { connectionCount: "desc" },
    });

    // Same tier or lower than the restricted account.
    const options = candidates
      .map((a) => ({ ...a, monthlyPrice: monthlyRentalPrice(a) }))
      .filter((a) => a.monthlyPrice <= oldPrice)
      .map((a) => maskPublicAccount(a));

    return NextResponse.json({ oldPrice, options });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("replacement-options error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
