import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { Prisma } from "@/generated/prisma/client";

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const { accountIds, autoRenew = true } = await req.json();

    if (!accountIds || !Array.isArray(accountIds) || accountIds.length === 0) {
      return NextResponse.json({ error: "No accounts selected" }, { status: 400 });
    }

    const accounts = await prisma.linkedInAccount.findMany({
      where: { id: { in: accountIds }, status: "available" },
    });

    if (accounts.length === 0) {
      return NextResponse.json({ error: "No selected accounts are available" }, { status: 400 });
    }

    const totalPrice = accounts.reduce(
      (sum, a) => sum.add(a.monthlyPrice),
      new Prisma.Decimal(0)
    );

    // Check balance
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: { usdcBalance: true },
    });

    if (!userData || userData.usdcBalance.lessThan(totalPrice)) {
      return NextResponse.json(
        {
          error: "Insufficient USDC balance",
          required: totalPrice.toString(),
          available: userData?.usdcBalance?.toString() || "0",
        },
        { status: 400 }
      );
    }

    // Process payment in a transaction
    const rentalIds = await prisma.$transaction(async (tx) => {
      // Deduct balance
      await tx.user.update({
        where: { id: user.id },
        data: { usdcBalance: { decrement: totalPrice } },
      });

      const ids: string[] = [];

      for (const account of accounts) {
        // Create rental
        const rental = await tx.rental.create({
          data: {
            userId: user.id,
            linkedinAccountId: account.id,
            usdcPayment: true,
            autoRenew: !!autoRenew,
            status: "active",
            currentPeriodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()),
            accessGrantedAt: new Date(),
          },
        });

        // Mark account as rented
        await tx.linkedInAccount.update({
          where: { id: account.id },
          data: { status: "rented" },
        });

        // Record transaction
        await tx.transaction.create({
          data: {
            userId: user.id,
            type: "rental_payment",
            amount: account.monthlyPrice.negated(),
            rentalId: rental.id,
            description: `Rental payment for ${account.linkedinName}`,
          },
        });

        ids.push(rental.id);
      }

      return ids;
    });

    return NextResponse.json({ success: true, rentalIds });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("USDC checkout error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
