import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { requireAuth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { monthlyRentalPrice } from "@/lib/account-pricing";
import { canReplaceNow } from "@/lib/replacement";
import { grantRentalAccess, revokeRentalAccess } from "@/lib/rental-access";

// Self-serve replacement: swap a RESTRICTED rental for an equivalent available account.
// Ends the old rental (status "replaced"), starts a new one that carries the old locked price,
// billing date + a downtime credit, links the two via replacesRentalId, and grants GoLogin.
// No charge, and exempt from the daily rental cap.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const { newAccountId } = await req.json();
    if (!newAccountId || typeof newAccountId !== "string") {
      return NextResponse.json({ error: "Pick an account to switch to." }, { status: 400 });
    }

    const old = await prisma.rental.findFirst({
      where: { id, userId: user.id },
      include: { linkedinAccount: { select: { id: true, linkedinName: true, restrictedAt: true, connectionCount: true, accountAgeMonths: true, hasSalesNav: true, linkedinVerified: true } } },
    });
    if (!old) return NextResponse.json({ error: "Rental not found" }, { status: 404 });
    if (!["active", "pending_access", "payment_failed"].includes(old.status)) {
      return NextResponse.json({ error: "This rental can no longer be replaced." }, { status: 409 });
    }
    const oldAcct = old.linkedinAccount;
    if (!oldAcct.restrictedAt) {
      return NextResponse.json({ error: "This account isn't restricted, so it can't be replaced." }, { status: 400 });
    }
    if (!canReplaceNow(oldAcct.restrictedAt)) {
      return NextResponse.json({ error: "We're still trying to recover this account. Replacement unlocks after the recovery window." }, { status: 409 });
    }

    const oldPrice = monthlyRentalPrice(oldAcct);

    // Carry over the remaining paid time plus a credit for the downtime so far (mirrors the
    // recovery credit in restriction.ts: currentPeriodEnd + time-restricted).
    const downtimeMs = Math.max(0, Date.now() - new Date(oldAcct.restrictedAt).getTime());
    const base = old.currentPeriodEnd ? new Date(old.currentPeriodEnd).getTime() : Date.now();
    const carriedPeriodEnd = new Date(base + downtimeMs);

    let newRentalId: string;
    try {
      newRentalId = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${newAccountId}))`;

        // Re-validate the chosen account is still genuinely available, same tier or lower.
        const picked = await tx.linkedInAccount.findFirst({
          where: { id: newAccountId, status: "available", listed: true, restrictedAt: null, twoFactorResetNeeded: false, inventoryPool: { notIn: ["ortus", "apex"] } },
          select: { id: true, linkedinName: true, connectionCount: true, accountAgeMonths: true, hasSalesNav: true, linkedinVerified: true },
        });
        if (!picked) throw new Error("UNAVAILABLE");
        const newTier = monthlyRentalPrice(picked);
        if (newTier > oldPrice) throw new Error("TIER");
        // Rate drops to the cheaper account: new locked price = min(their current effective
        // rate, the new account's tier). Never higher than what they paid before.
        const effectiveOld = old.lockedPrice ? Number(old.lockedPrice) : oldPrice;
        const newRate = Math.min(effectiveOld, newTier);

        // Guard against a double-replace: re-read the old rental's status inside the lock.
        const stillOld = await tx.rental.findFirst({ where: { id: old.id, status: { in: ["active", "pending_access", "payment_failed"] } }, select: { id: true } });
        if (!stillOld) throw new Error("ALREADY");

        // One shadow holder per account — don't let a shadow replacement land on an account
        // another shadow renter already holds.
        if (old.isShadow) {
          const held = await tx.rental.count({ where: { linkedinAccountId: picked.id, isShadow: true, status: { in: ["active", "pending_access", "payment_failed"] } } });
          if (held) throw new Error("SHADOWHELD");
        }

        const created = await tx.rental.create({
          data: {
            userId: user.id,
            linkedinAccountId: picked.id,
            usdcPayment: old.usdcPayment,
            autoRenew: old.autoRenew,
            status: "pending_access",
            accessGrantedAt: null,
            // A shadow replacement stays shadow (flat rate, keeps the account catalogue-available);
            // a real replacement takes the new account out of the catalogue.
            isShadow: old.isShadow,
            lockedPrice: new Prisma.Decimal(newRate),
            discountCode: old.discountCode,
            replacesRentalId: old.id,
            currentPeriodEnd: carriedPeriodEnd,
            notes: `Replacement for ${oldAcct.linkedinName} (restricted ${new Date(oldAcct.restrictedAt!).toISOString().slice(0, 10)})`,
          },
          select: { id: true },
        });

        await tx.rental.update({ where: { id: old.id }, data: { status: "replaced", notes: old.notes ? `${old.notes} · Replaced by ${picked.linkedinName}` : `Replaced by ${picked.linkedinName}` } });

        if (!old.isShadow) {
          // Real rental: new account leaves the catalogue; the old restricted account is freed
          // back to inventory but stays gated by restrictedAt (admin recovers it) + 2FA reset.
          await tx.linkedInAccount.update({ where: { id: picked.id }, data: { status: "rented" } });
          await tx.linkedInAccount.update({ where: { id: oldAcct.id }, data: { status: "available", twoFactorResetNeeded: true } });
        }
        // Shadow rental: leave both accounts' status untouched (shadow never owns the account).

        return created.id;
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg === "UNAVAILABLE") return NextResponse.json({ error: "That account was just taken. Pick another." }, { status: 409 });
      if (msg === "TIER") return NextResponse.json({ error: "That account is a higher tier than the one you're replacing." }, { status: 400 });
      if (msg === "ALREADY") return NextResponse.json({ error: "This rental was already replaced." }, { status: 409 });
      if (msg === "SHADOWHELD") return NextResponse.json({ error: "That account is already held. Pick another." }, { status: 409 });
      throw e;
    }

    // Stop billing the dead account (card renters). Wallet rentals have no Stripe sub.
    if (old.stripeSubscriptionId) {
      try { await stripe.subscriptions.cancel(old.stripeSubscriptionId); }
      catch (e) { console.error("replace: cancel old Stripe sub failed:", old.stripeSubscriptionId, e instanceof Error ? e.message : e); }
    }
    // Cut access to the restricted account.
    try { await revokeRentalAccess(old.id); }
    catch (e) { console.error("replace: revoke old access failed:", old.id, e instanceof Error ? e.message : e); }
    // A real replacement auto-grants GoLogin on the new account (cron retries if not ready).
    // A shadow replacement is prepared manually (shadow rentals are never auto-granted), so
    // it stays pending_access until the team hands it over — matching normal shadow checkout.
    if (!old.isShadow) {
      try { await grantRentalAccess(newRentalId); }
      catch (e) { console.error("replace: grant new access failed (cron will retry):", newRentalId, e instanceof Error ? e.message : e); }
    }

    return NextResponse.json({ newRentalId });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("replace error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
