import { prisma } from "@/lib/prisma";
import { revokeRentalAccess } from "@/lib/rental-access";
import { sendShadowYieldEmail } from "@/services/email";
import { stripe } from "@/lib/stripe";
import { deletePublicShareLink, getPublicShareLink, tokenForAccount } from "@/services/gologin";

const LIVE = ["active", "pending_access", "payment_failed"] as const;
export const SHADOW_NOTICE_MS = 7 * 24 * 60 * 60 * 1000;
export function paidMonthEnd(start: Date): Date {
  const end = new Date(start);
  const day = end.getUTCDate();
  end.setUTCDate(1);
  end.setUTCMonth(end.getUTCMonth() + 1);
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
  end.setUTCDate(Math.min(day, last));
  return end;
}

export async function scheduleShadowHandover(accountId: string, reason?: string): Promise<number> {
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${accountId}))`;
    const customer = await tx.rental.findFirst({ where: { linkedinAccountId: accountId, isShadow: false, status: { in: [...LIVE] } }, orderBy: { createdAt: "desc" } });
    if (!customer) return 0;
    const shadows = await tx.rental.findMany({ where: { linkedinAccountId: accountId, isShadow: true, status: { in: [...LIVE] } } });
    if (!shadows.length) return 0;
    const due = new Date(Math.max(Date.now() + SHADOW_NOTICE_MS, ...shadows.map(s => s.shadowExitAt?.getTime() ?? 0)));
    const existingDue = shadows.every(s => s.shadowExitAt) ? new Date(Math.max(...shadows.map(s => s.shadowExitAt!.getTime()))) : due;
    await tx.rental.update({ where: { id: customer.id }, data: { status: "pending_access", handoverAt: existingDue, currentPeriodEnd: null } });
    for (const s of shadows) {
      if (!s.shadowExitAt) await tx.rental.update({ where: { id: s.id }, data: { shadowExitAt: existingDue, autoRenew: false, notes: [s.notes, `Seven-day handover notice scheduled${reason ? ` (${reason})` : ""}`].filter(Boolean).join(" | ") } });
      // Refund the last paid monthly fee once, preserving the existing full-fee credit policy.
      // No payment record means no fabricated credit (e.g. internal free pool rentals).
      if (!s.shadowCreditAt) {
        const paid = await tx.transaction.findFirst({ where: { rentalId: s.id, type: "rental_payment" }, orderBy: { createdAt: "desc" } });
        const credit = paid ? Math.abs(Number(paid.amount)) : 0;
        if (credit > 0) {
          await tx.user.update({ where: { id: s.userId }, data: { usdcBalance: { increment: credit } } });
          await tx.transaction.create({ data: { userId: s.userId, rentalId: s.id, type: "refund", amount: credit, description: "Shadow handover: monthly fee returned as wallet credit" } });
        }
        await tx.rental.update({ where: { id: s.id }, data: { shadowCreditAt: new Date() } });
      }
    }
    return shadows.length;
  });
}

// Runs before automatic grants. Failed notice/revocation leaves the incoming rental
// pending, with no access and no paid-month clock running. Retry on the next pass.
export async function processShadowHandovers() {
  const incoming = await prisma.rental.findMany({ where: { isShadow: false, status: "pending_access" }, select: { linkedinAccountId: true } });
  for (const r of incoming) await scheduleShadowHandover(r.linkedinAccountId);
  const waiting = await prisma.rental.findMany({ where: { status: "pending_access", handoverAt: { not: null }, stripeSubscriptionId: { not: null } } });
  for (const r of waiting) await stripe.subscriptions.update(r.stripeSubscriptionId!, { pause_collection: { behavior: "void" } });
  const shadows = await prisma.rental.findMany({ where: { isShadow: true, shadowExitAt: { not: null }, status: { in: [...LIVE] } }, include: { user: true, linkedinAccount: true } });
  for (const s of shadows) {
    try {
      if (s.stripeSubscriptionId) await stripe.subscriptions.update(s.stripeSubscriptionId, { pause_collection: { behavior: "void" } });
      if (!s.shadowNoticeSentAt) {
        const due = new Date(Date.now() + SHADOW_NOTICE_MS);
        const credit = await prisma.transaction.findFirst({ where: { rentalId: s.id, type: "refund", description: "Shadow handover: monthly fee returned as wallet credit" } });
        await sendShadowYieldEmail(s.user.email, s.linkedinAccount.linkedinName, due, Number(credit?.amount ?? 0));
        await prisma.$transaction([
          prisma.rental.update({ where: { id: s.id }, data: { shadowNoticeSentAt: new Date(), shadowExitAt: due } }),
          prisma.rental.updateMany({ where: { linkedinAccountId: s.linkedinAccountId, isShadow: false, status: "pending_access" }, data: { handoverAt: due, currentPeriodEnd: null } }),
        ]);
        continue;
      }
      if (s.shadowExitAt!.getTime() > Date.now()) continue;
      // Remove public access as well as email shares; never hand over after a failed revoke.
      const profileId = s.linkedinAccount.gologinProfileId;
      if (profileId) {
        const token = tokenForAccount(s.linkedinAccount.gologinAccount);
        const link = await getPublicShareLink(profileId, undefined, token);
        if (link) await deletePublicShareLink(link.linkId, profileId, token);
        await prisma.linkedInAccount.update({ where: { id: s.linkedinAccountId }, data: { gologinShareLink: null } });
      }
      const revoked = await revokeRentalAccess(s.id);
      if (revoked.some(r => !r.ok)) throw new Error("Shadow access could not be fully revoked");
      if (s.stripeSubscriptionId) await stripe.subscriptions.cancel(s.stripeSubscriptionId, { prorate: false });
      await prisma.rental.update({ where: { id: s.id }, data: { status: "expired", currentPeriodEnd: new Date(), autoRenew: false, gologinShareLinkId: null, gologinShareLinkUrl: null } });
    } catch (error) {
      console.error("Shadow handover needs retry", s.id, error instanceof Error ? error.message : error);
    }
  }
}
