import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { revokeRentalAccess } from "@/lib/rental-access";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find USDC rentals due for renewal (within 24 hours or past due)
    const cutoff = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const dueRentals = await prisma.rental.findMany({
      where: {
        usdcPayment: true,
        status: "active",
        autoRenew: true,
        currentPeriodEnd: { lte: cutoff },
      },
      include: {
        user: true,
        linkedinAccount: true,
      },
    });

    let renewed = 0;
    let failed = 0;

    for (const rental of dueRentals) {
      const price = rental.linkedinAccount.monthlyPrice;

      if (rental.user.usdcBalance.greaterThanOrEqualTo(price)) {
        // Sufficient balance — renew
        await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: rental.userId },
            data: { usdcBalance: { decrement: price } },
          });

          await tx.rental.update({
            where: { id: rental.id },
            data: {
              currentPeriodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()),
            },
          });

          await tx.transaction.create({
            data: {
              userId: rental.userId,
              type: "rental_payment",
              amount: new Prisma.Decimal(price.toString()).negated(),
              rentalId: rental.id,
              description: `Monthly renewal for ${rental.linkedinAccount.linkedinName}`,
            },
          });
        });
        renewed++;
      } else {
        // Insufficient balance — mark as failed and cut the renter's access
        await prisma.rental.update({
          where: { id: rental.id },
          data: { status: "payment_failed" },
        });
        try { await revokeRentalAccess(rental.id); } catch (e) { console.error("revoke on payment_failed", rental.id, e); }
        failed++;
      }
    }

    // Expire non-renewing rentals whose term has ended, and cut their GoLogin access.
    const expiredRentals = await prisma.rental.findMany({
      where: { status: "active", autoRenew: false, currentPeriodEnd: { lt: new Date() } },
      select: { id: true },
    });
    let expired = 0;
    for (const r of expiredRentals) {
      await prisma.rental.update({ where: { id: r.id }, data: { status: "expired" } });
      try { await revokeRentalAccess(r.id); } catch (e) { console.error("revoke on expire", r.id, e); }
      expired++;
    }

    return NextResponse.json({
      processed: dueRentals.length,
      renewed,
      failed,
      expired,
    });
  } catch (error) {
    console.error("Renewal processing error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
