import { prisma } from "@/lib/prisma";
import { revokeRentalAccess } from "@/lib/rental-access";
import { sendShadowYieldEmail } from "@/services/email";

// Per-renter flat monthly rate. A shadow renter pays this per idle account instead of the
// account's tier/Sales Nav/verified price. Each shadow email has its OWN rate.
// Override via env SHADOW_RENTER_RATES="email:rate,email:rate".
export const SHADOW_RENTER_RATES: Record<string, number> = (() => {
  const out: Record<string, number> = { "info@apexstrategy.io": 20, "info@ortus.solutions": 25 };
  const raw = process.env.SHADOW_RENTER_RATES;
  if (raw) {
    for (const pair of raw.split(",")) {
      const [em, rate] = pair.split(":").map((s) => s.trim());
      const n = Number(rate);
      if (em && Number.isFinite(n) && n > 0) out[em.toLowerCase()] = n;
    }
  }
  return out;
})();

// Legacy default (Apex rate) — kept for any caller that still references a single price.
export const SHADOW_MONTHLY_PRICE = 20;

export const SHADOW_RENTER_EMAILS = Object.keys(SHADOW_RENTER_RATES);

// The flat rate for a shadow renter's email, or null if they're not a shadow renter.
export const shadowRateFor = (email?: string | null): number | null =>
  email ? (SHADOW_RENTER_RATES[email.toLowerCase()] ?? null) : null;

export const isShadowRenterEmail = (email?: string | null): boolean => shadowRateFor(email) !== null;

// Account ids that already have an ACTIVE shadow rental — a given account can be shadow-
// bought by only ONE shadow renter at a time, and it must read as unavailable to shadow
// buyers (but still available to everyone else).
export async function activeShadowAccountIds(): Promise<Set<string>> {
  const rows = await prisma.rental.findMany({
    where: { isShadow: true, status: { in: ["active", "pending_access", "payment_failed"] } },
    select: { linkedinAccountId: true },
  });
  return new Set(rows.map((r) => r.linkedinAccountId));
}

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
    const refund = shadowRateFor(s.user.email) ?? SHADOW_MONTHLY_PRICE;
    const stamp = new Date().toISOString().slice(0, 10);
    const yieldNote = `Yielded to a customer rental on ${stamp}${opts?.reason ? ` (${opts.reason})` : ""} — $${refund} refunded as credit`;
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

    // 3. Refund the flat shadow fee as account credit (their usdcBalance), so it's
    //    usable toward another shadow rental — "taken away, money back as credit".
    try {
      await prisma.user.update({
        where: { id: s.userId },
        data: { usdcBalance: { increment: refund } },
      });
    } catch (e) {
      console.error("shadow yield: refund credit failed:", s.id, e instanceof Error ? e.message : e);
    }

    // 4. Tell the shadow renter we've taken the account back (the sent email is itself
    //    logged in email_log / /admin/emails, so it doubles as the audit trail).
    try {
      await sendShadowYieldEmail(s.user.email, s.linkedinAccount.linkedinName);
    } catch (e) {
      console.error("shadow yield: email failed:", s.id, e instanceof Error ? e.message : e);
    }
  }

  return shadows.length;
}
