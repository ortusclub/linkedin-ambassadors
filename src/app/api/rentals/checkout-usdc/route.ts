import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { Prisma } from "@/generated/prisma/client";
import { sendRentalReadyEmail, sendRentalNotification } from "@/services/email";
import { grantRentalAccess } from "@/lib/rental-access";
import { SALES_NAV_MONTHLY } from "@/lib/utils";

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const { accountIds, autoRenew = true, salesNavAccountIds } = await req.json();

    if (!accountIds || !Array.isArray(accountIds) || accountIds.length === 0) {
      return NextResponse.json({ error: "No accounts selected" }, { status: 400 });
    }

    // Accounts the renter chose to add Sales Navigator to (+$70/mo each). Only
    // honoured for accounts that don't already include it.
    const salesNavSet = new Set<string>(
      Array.isArray(salesNavAccountIds) ? salesNavAccountIds : []
    );

    const accounts = await prisma.linkedInAccount.findMany({
      where: { id: { in: accountIds }, status: "available" },
    });

    if (accounts.length === 0) {
      return NextResponse.json({ error: "No selected accounts are available" }, { status: 400 });
    }

    // Effective monthly charge per account = base price + Sales Nav add-on (if chosen
    // and not already included). This is the amount we bill now AND lock in for renewals.
    const addonFor = (a: (typeof accounts)[number]) =>
      salesNavSet.has(a.id) && !a.hasSalesNav ? SALES_NAV_MONTHLY : 0;
    const priceFor = (a: (typeof accounts)[number]) =>
      a.monthlyPrice.add(addonFor(a));

    const totalPrice = accounts.reduce(
      (sum, a) => sum.add(priceFor(a)),
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
      const created = await prisma.$transaction(async (tx) => {
        const arr: { rentalId: string; accountId: string }[] = [];

        for (const account of accounts) {
          const withSalesNav = addonFor(account) > 0;
          const effectivePrice = priceFor(account);
          // Create as pending_access; we attempt the actual grant right after commit.
          const rental = await tx.rental.create({
            data: {
              userId: user.id,
              linkedinAccountId: account.id,
              usdcPayment: true,
              autoRenew: !!autoRenew,
              status: "pending_access",
              accessGrantedAt: null,
              // Lock the base+add-on rate so every renewal bills the Sales Nav add-on
              // too (all billing paths read lockedPrice ?? monthlyPrice).
              lockedPrice: withSalesNav ? effectivePrice : null,
              notes: withSalesNav ? "Sales Navigator add-on (+$70/mo)" : null,
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
              amount: effectivePrice.negated(),
              rentalId: rental.id,
              description: `Rental payment for ${account.linkedinName}${withSalesNav ? " (+ Sales Navigator)" : ""}`,
            },
          });

          arr.push({ rentalId: rental.id, accountId: account.id });
        }

        return arr;
      });

      // AUTO-GRANT each on the spot (after commit, so grantRentalAccess sees the rentals).
      // Shares to the renter via the right master/klabber token + flips to active. If the
      // renter hasn't set up GoLogin yet it throws -> stays pending_access; the cron retries.
      const readyByAccount = new Map<string, boolean>();
      for (const { rentalId, accountId } of created) {
        const account = accounts.find((a) => a.id === accountId);
        if (!account?.gologinProfileId) { readyByAccount.set(accountId, false); continue; }
        try {
          await grantRentalAccess(rentalId);
          readyByAccount.set(accountId, true);
        } catch (e) {
          console.error("auto-grant on rental start failed (cron will retry):", rentalId, e instanceof Error ? e.message : e);
          readyByAccount.set(accountId, false);
        }
      }
      const rentalIds = created.map((c) => c.rentalId);

      // ONE consolidated email for the whole order (not one per account — that fires a
      // burst of near-identical emails that get rate-limited / threaded into one).
      try {
        await sendRentalReadyEmail(
          user.email,
          accounts.map((a) => ({ name: a.linkedinName, ready: readyByAccount.get(a.id) || false }))
        );
      } catch (e) {
        console.error("Failed to send rental email:", e);
      }
      try {
        await sendRentalNotification({
          customerEmail: user.email,
          customerName: user.fullName,
          accountName: accounts.map((a) => a.linkedinName).join(", "),
        });
      } catch (e) {
        console.error("Failed to send rental notification:", e);
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
