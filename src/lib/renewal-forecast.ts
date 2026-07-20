import { prisma } from "@/lib/prisma";
import {
  renderEmail,
  sendRenewalReminder3d,
  sendRenewalGraceNotice,
  sendRenewalWinBack,
  sendAccessRevokedEmail,
  sendRenewalHeadsUp,
  sendRenewalConfirmation,
  sendPaymentFailedEmail,
} from "@/services/email";

const DAY = 24 * 60 * 60 * 1000;
const RECLAIM_DAYS = 3;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://linkedvelocity.com";
const fmtDate = (d: Date) => d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
const firstNameOf = (full: string | null) => (full || "").trim().split(" ")[0] || "";

export interface ForecastEvent {
  date: string; // ISO — projected send date
  rentalId: string;
  account: string;
  to: string;
  stage: string;
  label: string;
  subject: string;
  html: string;
  condition: string | null; // null = will send; else the condition it depends on
}

// Projects the upcoming renewal emails for every active/expired rental by mirroring the
// process-renewals cadence, and renders each one's REAL content (capture mode — nothing sends).
// "condition" flags the branches that only fire if something happens (e.g. a charge fails).
export async function buildRenewalForecast(now = new Date()): Promise<ForecastEvent[]> {
  const rentals = await prisma.rental.findMany({
    where: { status: { in: ["active", "expired"] }, currentPeriodEnd: { not: null }, linkedinAccount: { restrictedAt: null } },
    include: { user: true, linkedinAccount: true },
  });

  const events: ForecastEvent[] = [];

  // The cron runs daily at 09:00 UTC. An email whose trigger time is already in the past (an
  // overdue rental) actually fires at the NEXT run — clamp to that so the forecast shows a real
  // future date, never a past one.
  const nextRun = (from: Date) => {
    const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), 9, 0, 0));
    if (d.getTime() <= from.getTime()) d.setUTCDate(d.getUTCDate() + 1);
    return d;
  };
  const nr = nextRun(now);
  const fire = (t: Date) => (t.getTime() <= now.getTime() ? nr : t);

  for (const r of rentals) {
    if (!r.currentPeriodEnd) continue;
    const end = new Date(r.currentPeriodEnd);
    const first = firstNameOf(r.user.fullName);
    const email = r.user.email;
    const acct = r.linkedinAccount.linkedinName;
    const amount = `$${Number(r.lockedPrice ?? r.linkedinAccount.monthlyPrice).toFixed(0)}`;
    const renewUrl = `${APP_URL}/api/rentals/${r.id}/renew`;
    const sent = Array.isArray(r.renewalRemindersSent) ? (r.renewalRemindersSent as string[]) : [];
    const onCard = !r.stripeSubscriptionId && !!r.user.stripePaymentMethodId;
    const releaseDate = new Date(end.getTime() + RECLAIM_DAYS * DAY);

    const add = async (date: Date, stage: string, label: string, condition: string | null, fn: () => Promise<unknown>) => {
      try {
        const rendered = await renderEmail(fn);
        if (!rendered) return;
        events.push({
          date: date.toISOString(), rentalId: r.id, account: acct, to: email,
          stage, label, subject: rendered.subject, html: rendered.html, condition,
        });
      } catch (e) {
        console.error("forecast render failed", stage, r.id, e instanceof Error ? e.message : e);
      }
    };

    // Only project stages that will ACTUALLY still fire — mirror the cron's own conditions so
    // already-sent or window-passed stages don't appear as "upcoming".
    const overdue = now.getTime() >= end.getTime();
    if (r.status === "active" && r.autoRenew) {
      // Auto-renew (card on file / wallet). Heads-up only while not yet due and not already sent.
      if (!sent.includes("heads_up") && !overdue) {
        await add(fire(new Date(end.getTime() - 3 * DAY)), "heads_up", "Pre-charge reminder (~3 days before)", null,
          () => sendRenewalHeadsUp(email, first, fmtDate(end), onCard ? amount : undefined, onCard ? r.user.cardLast4 : undefined));
      }
      await add(fire(end), "confirmation", "Renewal confirmation", "if the charge succeeds", () => sendRenewalConfirmation(email));
      await add(fire(end), "payment_hiccup", "Payment hiccup (dunning)", "if the charge fails", () => sendPaymentFailedEmail(email, first, renewUrl));
      await add(fire(releaseDate), "access_revoked", "Access paused", "if still unpaid after retries", () => sendAccessRevokedEmail(email, first, renewUrl, fmtDate(releaseDate), acct));
    } else if (r.status === "active" && !r.autoRenew) {
      // Manual cadence — each stage gated on the cron's real precondition.
      if (!sent.includes("reminder_3d") && !overdue) {
        await add(fire(new Date(end.getTime() - 3 * DAY)), "reminder_3d", "Renewal reminder (3 days before)", null,
          () => sendRenewalReminder3d(email, first, renewUrl, fmtDate(end), amount));
      }
      if (!sent.includes("grace") && now.getTime() < end.getTime() + DAY) {
        await add(fire(end), "grace", "Grace notice (24h left)", null,
          () => sendRenewalGraceNotice(email, first, renewUrl, fmtDate(new Date(end.getTime() + DAY)), amount));
      }
      await add(fire(new Date(end.getTime() + DAY)), "access_revoked", "Access paused (lapse)", "if unpaid", () => sendAccessRevokedEmail(email, first, renewUrl, fmtDate(releaseDate), acct));
      if (!sent.includes("winback") && now.getTime() < end.getTime() + RECLAIM_DAYS * DAY) {
        await add(fire(new Date(end.getTime() + (RECLAIM_DAYS - 1) * DAY)), "winback", "Last chance (win-back)", "if still unpaid", () => sendRenewalWinBack(email, first, renewUrl, amount, acct, fmtDate(releaseDate)));
      }
    } else if (r.status === "expired" && !sent.includes("winback") && now.getTime() < end.getTime() + RECLAIM_DAYS * DAY) {
      await add(fire(new Date(end.getTime() + (RECLAIM_DAYS - 1) * DAY)), "winback", "Last chance (win-back)", "if still unpaid", () => sendRenewalWinBack(email, first, renewUrl, amount, acct, fmtDate(releaseDate)));
    }
  }

  events.sort((a, b) => a.date.localeCompare(b.date));
  return events;
}
