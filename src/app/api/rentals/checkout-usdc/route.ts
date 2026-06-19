import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { Prisma } from "@/generated/prisma/client";
import { sendRentalOnboardingEmail, sendAccessReadyEmail, sendRentalNotification } from "@/services/email";

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

    // Atomically check and deduct balance to prevent race condition
    const deducted = await prisma.$executeRaw`
      UPDATE users
      SET usdc_balance = usdc_balance - ${totalPrice.toNumber()}::decimal
      WHERE id = ${user.id}::uuid
        AND usdc_balance >= ${totalPrice.toNumber()}::decimal
    `;

    if (deducted === 0) {
      const userData = await prisma.user.findUnique({
        where: { id: user.id },
        select: { usdcBalance: true },
      });
      return NextResponse.json(
        {
          error: "Insufficient USDC balance",
          required: totalPrice.toString(),
          available: userData?.usdcBalance?.toString() || "0",
        },
        { status: 400 }
      );
    }

    // Balance deducted — now create rentals in a transaction
    try {
      const rentalIds = await prisma.$transaction(async (tx) => {
        const ids: string[] = [];

        for (const account of accounts) {
          // Accounts with a GoLogin share link are openable immediately -> active.
          // Anything without one waits for a manual grant (pending_access).
          const instant = !!account.gologinShareLink;
          const rental = await tx.rental.create({
            data: {
              userId: user.id,
              linkedinAccountId: account.id,
              usdcPayment: true,
              autoRenew: !!autoRenew,
              status: instant ? "active" : "pending_access",
              accessGrantedAt: instant ? new Date() : null,
              currentPeriodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()),
            },
          });

          await tx.linkedInAccount.update({
            where: { id: account.id },
            data: { status: "rented" },
          });

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

      // Email + admin notify, per account. Instant (share-link) accounts get the
      // "you're live" email; others get the "we're getting it ready" onboarding email.
      for (const account of accounts) {
        try {
          if (account.gologinShareLink) {
            await sendAccessReadyEmail(user.email, account.linkedinName);
          } else {
            await sendRentalOnboardingEmail(user.email, account.linkedinName);
          }
        } catch (e) {
          console.error("Failed to send rental email:", e);
        }
        try {
          await sendRentalNotification({
            customerEmail: user.email,
            customerName: user.fullName,
            accountName: account.linkedinName,
          });
        } catch (e) {
          console.error("Failed to send rental notification:", e);
        }
      }

      return NextResponse.json({ success: true, rentalIds });
    } catch (rentalError) {
      // Rental creation failed — refund the balance
      await prisma.$executeRaw`
        UPDATE users
        SET usdc_balance = usdc_balance + ${totalPrice.toNumber()}::decimal
        WHERE id = ${user.id}::uuid
      `;
      console.error("USDC checkout rental creation failed, balance refunded:", rentalError);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("USDC checkout error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
