import { prisma } from "@/lib/prisma";
import {
  renderEmail,
  sendRenewalReminder3dBatch,
  sendRenewalGraceNoticeBatch,
  sendRenewalWinBackBatch,
  sendAccessRevokedBatch,
  sendRenewalHeadsUp,
  sendRenewalHeadsUpBatch,
  sendRenewalConfirmation,
  sendPaymentFailedEmail,
  sendAccessRevokedEmail,
} from "@/services/email";

const DAY = 24 * 60 * 60 * 1000;
const RECLAIM_DAYS = 3;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://linkedvelocity.com";
const fmtDate = (d: Date) => d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
const firstNameOf = (full: string | null) => (full || "").trim().split(" ")[0] || "";

export interface ForecastEvent {
  date: string;
  rentalId: string;
  account: string;
  to: string;
  stage: string;
  label: string;
  subject: string;
  html: string;
  condition: string | null;
}

type AItem = { account: string; date?: string; amount?: string };

// Projects the upcoming renewal emails for every active/expired rental, MIRRORING how the cron
// actually sends: consolidated per renter (manual dunning + card-on-file heads-up are one email
// per renter listing all their accounts). Renders each with the real template (capture mode —
// nothing is dispatched). Only stages that will still fire are included; overdue triggers are
// clamped to the next 09:00 UTC run so no past date ever shows.
export async function buildRenewalForecast(now = new Date()): Promise<ForecastEvent[]> {
  const rentals = await prisma.rental.findMany({
    where: { status: { in: ["active", "expired"] }, currentPeriodEnd: { not: null }, linkedinAccount: { restrictedAt: null } },
    include: { user: true, linkedinAccount: true },
  });

  const events: ForecastEvent[] = [];
  const nextRun = (from: Date) => {
    const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), 9, 0, 0));
    if (d.getTime() <= from.getTime()) d.setUTCDate(d.getUTCDate() + 1);
    return d;
  };
  const nr = nextRun(now);
  const fire = (t: Date) => (t.getTime() <= now.getTime() ? nr : t);

  const add = async (fireDate: Date, to: string, account: string, stage: string, label: string, condition: string | null, fn: () => Promise<unknown>) => {
    try {
      const r = await renderEmail(fn);
      if (!r) return;
      events.push({ date: fireDate.toISOString(), rentalId: "", account, to, stage, label, subject: r.subject, html: r.html, condition });
    } catch (e) {
      console.error("forecast render failed", stage, e instanceof Error ? e.message : e);
    }
  };

  type Row = (typeof rentals)[number];
  const byUser = new Map<string, Row[]>();
  for (const r of rentals) {
    if (!r.currentPeriodEnd) continue;
    const a = byUser.get(r.userId) ?? [];
    a.push(r);
    byUser.set(r.userId, a);
  }

  const summarize = (items: AItem[]) => (items.length === 1 ? items[0].account : `${items.length} profiles`);

  for (const rows of byUser.values()) {
    const u = rows[0].user;
    const first = firstNameOf(u.fullName);

    const headsUp: { account: string; date: string; amount: string }[] = [];
    let headsUpFire: Date | null = null;
    // Key by stage AND fire-day: the cron sends one email per run, so accounts only consolidate
    // if they hit the same stage on the SAME day. (Nico's Jul-18 accounts lapse today; his Jul-23
    // ones lapse Jul 24 — those are separate emails, not one 10-account blast.)
    const manual = new Map<string, { stage: string; items: AItem[]; fire: Date; graceDeadline?: string; releaseDate?: string }>();
    const addManual = (stage: string, item: AItem, f: Date, extra?: { graceDeadline?: string; releaseDate?: string }) => {
      const key = `${stage}|${f.toISOString().slice(0, 10)}`;
      let g = manual.get(key);
      if (!g) { g = { stage, items: [], fire: f }; manual.set(key, g); }
      g.items.push(item);
      if (f.getTime() < g.fire.getTime()) g.fire = f;
      if (extra?.graceDeadline) g.graceDeadline = extra.graceDeadline;
      if (extra?.releaseDate && (!g.releaseDate || extra.releaseDate < g.releaseDate)) g.releaseDate = extra.releaseDate;
    };

    for (const r of rows) {
      const end = new Date(r.currentPeriodEnd!);
      const sent = Array.isArray(r.renewalRemindersSent) ? (r.renewalRemindersSent as string[]) : [];
      const overdue = now.getTime() >= end.getTime();
      const amount = `$${Number(r.lockedPrice ?? r.linkedinAccount.monthlyPrice).toFixed(0)}`;
      const account = r.linkedinAccount.linkedinName;
      const onCard = !r.stripeSubscriptionId && !!u.stripePaymentMethodId;
      const renewUrl = `${APP_URL}/api/rentals/${r.id}/renew`;
      const releaseDate = new Date(end.getTime() + RECLAIM_DAYS * DAY);

      if (r.status === "active" && r.autoRenew) {
        // Auto-renew: heads-up is consolidated per renter; confirmation / hiccup / paused are per rental.
        if (!sent.includes("heads_up") && !overdue) {
          headsUp.push({ account, date: fmtDate(end), amount });
          const f = fire(new Date(end.getTime() - 3 * DAY));
          if (!headsUpFire || f.getTime() < headsUpFire.getTime()) headsUpFire = f;
        }
        await add(fire(end), u.email, account, "confirmation", "Renewal confirmation", "if the charge succeeds", () => sendRenewalConfirmation(u.email, account));
        await add(fire(end), u.email, account, "payment_hiccup", "Payment hiccup (dunning)", "if the charge fails", () => sendPaymentFailedEmail(u.email, first, renewUrl));
        await add(fire(releaseDate), u.email, account, "access_revoked", "Access paused", "if still unpaid after retries", () => sendAccessRevokedEmail(u.email, first, renewUrl, fmtDate(releaseDate), account));
      } else if (r.status === "active" && !r.autoRenew) {
        if (!sent.includes("reminder_3d") && !overdue) addManual("reminder_3d", { account, date: fmtDate(end), amount }, fire(new Date(end.getTime() - 3 * DAY)));
        if (!sent.includes("grace") && now.getTime() < end.getTime() + DAY) addManual("grace", { account, amount }, fire(end), { graceDeadline: fmtDate(new Date(end.getTime() + DAY)) });
        addManual("access_revoked", { account }, fire(new Date(end.getTime() + DAY)), { releaseDate: fmtDate(releaseDate) });
        // Win-back can only fire the run AFTER the lapse (the account must be "expired" first), and
        // only while still inside the reclaim window [end+2d, end+3d). For accounts already deep
        // overdue, that window has passed by the next run → no last-chance (they're just released).
        if (!sent.includes("winback")) {
          const afterLapse = nextRun(fire(new Date(end.getTime() + DAY)));
          if (afterLapse.getTime() >= end.getTime() + (RECLAIM_DAYS - 1) * DAY && afterLapse.getTime() < end.getTime() + RECLAIM_DAYS * DAY) {
            addManual("winback", { account, amount }, afterLapse, { releaseDate: fmtDate(releaseDate) });
          }
        }
      } else if (r.status === "expired" && !sent.includes("winback")) {
        const wf = fire(new Date(end.getTime() + (RECLAIM_DAYS - 1) * DAY));
        if (wf.getTime() < end.getTime() + RECLAIM_DAYS * DAY) addManual("winback", { account, amount }, wf, { releaseDate: fmtDate(releaseDate) });
      }
    }

    if (headsUp.length) {
      const total = `$${headsUp.reduce((s, i) => s + Number((i.amount || "$0").replace(/[^0-9.]/g, "")), 0).toFixed(0)}`;
      await add(headsUpFire ?? nr, u.email, summarize(headsUp), "heads_up", "Pre-charge reminder (~3 days before)", null,
        () => headsUp.length === 1
          ? sendRenewalHeadsUp(u.email, first, headsUp[0].date, headsUp[0].amount, u.cardLast4)
          : sendRenewalHeadsUpBatch(u.email, first, headsUp, total, u.cardLast4));
    }

    for (const g of manual.values()) {
      const stage = g.stage;
      const label = stage === "reminder_3d" ? "Renewal reminder (3 days before)" : stage === "grace" ? "Grace notice (24h left)" : stage === "access_revoked" ? "Access paused (lapse)" : "Last chance (win-back)";
      const condition = stage === "access_revoked" ? "if unpaid" : stage === "winback" ? "if still unpaid" : null;
      await add(g.fire, u.email, summarize(g.items), stage, label, condition,
        () => stage === "reminder_3d" ? sendRenewalReminder3dBatch(u.email, first, g.items)
          : stage === "grace" ? sendRenewalGraceNoticeBatch(u.email, first, g.items, g.graceDeadline || "")
          : stage === "access_revoked" ? sendAccessRevokedBatch(u.email, first, g.items, g.releaseDate)
          : sendRenewalWinBackBatch(u.email, first, g.items, g.releaseDate));
    }
  }

  events.sort((a, b) => a.date.localeCompare(b.date));
  return events;
}
