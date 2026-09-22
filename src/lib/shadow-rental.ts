import { prisma } from "@/lib/prisma";
import { revokeRentalAccess } from "@/lib/rental-access";
import { sendShadowYieldEmail } from "@/services/email";

// Flat monthly rate a shadow renter (e.g. Apex Strategy) pays per idle account.
// Overrides the account's tier/Sales Nav/verified price entirely.
export const SHADOW_MONTHLY_PRICE = 20;

// Emails treated as shadow renters. When one of these signs up (or rents), the account
// is flagged automatically — so the renter just registers/logs in themselves and we only
// have to "note the email" here. Overridable via env (comma-separated); defaults to Apex.
export const SHADOW_RENTER_EMAILS = (process.env.SHADOW_RENTER_EMAILS || "info@apexstrategy.io")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export const isShadowRenterEmail = (email?: string | null): boolean =>
  !!email && SHADOW_RENTER_EMAILS.includes(email.toLowerCase());

// Called right after a REAL (non-shadow) rental is created for an account. Any active
// shadow rental on that same account must yield: cut the shadow renter's GoLogin access,
// end their rental (with an audit note), and email them that we've reclaimed the account.
// Best-effort throughout — a failure here must never block the real customer's rental.
export async function yieldShadowRentals(
  accountId: string,
  opts?: { reason?: string }
): Promise<number> {
  const shadows = await prisma.rental.findMany({
    where: {
      linkedinAccountId: accountId,
      isShadow: true,
      status: { in: ["active", "pending_access", "payment_failed"] },
    },
    include: {
      user: { select: { email: true } },
      linkedinAccount: { select: { linkedinName: true } },
    },
  });

  for (const s of shadows) {
    // 1. Remove the shadow renter from the GoLogin profile.
    try {
      await revokeRentalAccess(s.id);
    } catch (e) {
      console.error("shadow yield: revoke access failed:", s.id, e instanceof Error ? e.message : e);
    }

    // 2. End the shadow rental with an audit note (kept visible in /admin/rentals).
    const stamp = new Date().toISOString().slice(0, 10);
    const yieldNote = `Yielded to a customer rental on ${stamp}${opts?.reason ? ` (${opts.reason})` : ""}`;
    try {
      await prisma.rental.update({
        where: { id: s.id },
        data: {
          status: "expired",
          autoRenew: false,
          currentPeriodEnd: new Date(),
          notes: s.notes ? `${s.notes} | ${yieldNote}` : yieldNote,
        },
      });
    } catch (e) {
      console.error("shadow yield: end rental failed:", s.id, e instanceof Error ? e.message : e);
    }

    // 3. Tell the shadow renter we've taken the account back (the sent email is itself
    //    logged in email_log / /admin/emails, so it doubles as the audit trail).
    try {
      await sendShadowYieldEmail(s.user.email, s.linkedinAccount.linkedinName);
    } catch (e) {
      console.error("shadow yield: email failed:", s.id, e instanceof Error ? e.message : e);
    }
  }

  return shadows.length;
}
