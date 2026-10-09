import { prisma } from "@/lib/prisma";
import { sendBillingPausedEmail } from "@/services/email";
import { formatDate } from "@/lib/utils";

// Days after the paid period ends before a non-renewing account is released back to inventory.
// Mirrors RECLAIM_DAYS in src/app/api/cron/process-renewals/route.ts.
const RECLAIM_DAYS = 3;

// Build the renter's current paused-billing picture and email it to them. Used by the
// self-serve renewal-off routes and the admin restriction route. Fire-and-forget: it never
// throws, so an email hiccup can't break the cancel/restrict action that triggered it.
export async function notifyBillingPaused(
  userId: string,
  opts: { trigger: "renewal_off" | "restricted"; highlightAccount: string }
): Promise<void> {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, fullName: true } });
    if (!user?.email) return;

    const rentals = await prisma.rental.findMany({
      where: { userId, isShadow: false, status: { in: ["active", "pending_access", "payment_failed"] } },
      select: { autoRenew: true, currentPeriodEnd: true, linkedinAccount: { select: { linkedinName: true, restrictedAt: true } } },
      orderBy: { createdAt: "desc" },
    });

    const notRenewing: { name: string; endDate: string; returnDate: string }[] = [];
    const restricted: { name: string; restrictedDate: string }[] = [];
    for (const r of rentals) {
      const name = r.linkedinAccount.linkedinName;
      if (r.linkedinAccount.restrictedAt) {
        restricted.push({ name, restrictedDate: formatDate(r.linkedinAccount.restrictedAt) });
      } else if (!r.autoRenew) {
        const end = r.currentPeriodEnd ? new Date(r.currentPeriodEnd) : null;
        const ret = end ? new Date(end.getTime() + RECLAIM_DAYS * 86400000) : null;
        notRenewing.push({
          name,
          endDate: end ? formatDate(end) : "the end of your period",
          returnDate: ret ? formatDate(ret) : "a few days later",
        });
      }
    }

    // Nothing currently paused for this renter -> don't send an empty email.
    if (!notRenewing.length && !restricted.length) return;

    const firstName = (user.fullName || "").trim().split(/\s+/)[0] || "";
    await sendBillingPausedEmail(user.email, firstName, {
      trigger: opts.trigger,
      highlightAccount: opts.highlightAccount,
      notRenewing,
      restricted,
    });
  } catch (e) {
    console.error("notifyBillingPaused failed for user", userId, e instanceof Error ? e.message : e);
  }
}
