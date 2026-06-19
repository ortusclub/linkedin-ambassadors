import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { revokeRentalAccess } from "@/lib/rental-access";
import {
  sendRenewalReminder3d,
  sendRenewalGraceNotice,
  sendRenewalWinBack,
  sendRenewalConfirmation,
  sendRenewalHeadsUp,
  sendAccessRevokedEmail,
} from "@/services/email";

const DAY = 24 * 60 * 60 * 1000;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://linkedvelocity.com";
const fmtDate = (d: Date) => d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
const firstNameOf = (full: string | null) => (full || "").trim().split(" ")[0] || "";

// Daily renewal pass:
//  - USDC auto-renew: charge from wallet at period end.
//  - Manual renewals (auto-renew OFF): the 3-touch cadence — reminder (3d before) →
//    grace notice (day of, 24h grace) → lapse+revoke (after grace) → win-back (+7d).
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const result = { renewed: 0, failed: 0, reminded: 0, graceNoticed: 0, lapsed: 0, winBack: 0, headsUp: 0 };

  try {
    // 0) Auto-renew ON — reassuring heads-up ~3 days before renewal (Stripe + USDC).
    const upcomingAuto = await prisma.rental.findMany({
      where: { autoRenew: true, status: "active", currentPeriodEnd: { gt: now, lte: new Date(now.getTime() + 3 * DAY) } },
      include: { user: true },
    });
    for (const r of upcomingAuto) {
      const sent = Array.isArray(r.renewalRemindersSent) ? (r.renewalRemindersSent as string[]) : [];
      if (sent.includes("heads_up") || !r.currentPeriodEnd) continue;
      try {
        await sendRenewalHeadsUp(r.user.email, firstNameOf(r.user.fullName), fmtDate(new Date(r.currentPeriodEnd)));
        await prisma.rental.update({ where: { id: r.id }, data: { renewalRemindersSent: [...sent, "heads_up"] as unknown as Prisma.InputJsonValue } });
        result.headsUp++;
      } catch (e) { console.error(e); }
    }

    // 1) USDC auto-renew — charge from wallet balance at (or just before) period end.
    const dueUsdc = await prisma.rental.findMany({
      where: { usdcPayment: true, status: "active", autoRenew: true, currentPeriodEnd: { lte: new Date(now.getTime() + DAY) } },
      include: { user: true, linkedinAccount: true },
    });
    for (const r of dueUsdc) {
      const price = r.lockedPrice ?? r.linkedinAccount.monthlyPrice;
      if (r.user.usdcBalance.greaterThanOrEqualTo(price)) {
        const base = r.currentPeriodEnd && r.currentPeriodEnd > now ? new Date(r.currentPeriodEnd) : now;
        const next = new Date(base.getFullYear(), base.getMonth() + 1, base.getDate());
        await prisma.$transaction(async (tx) => {
          await tx.user.update({ where: { id: r.userId }, data: { usdcBalance: { decrement: price } } });
          await tx.rental.update({
            where: { id: r.id },
            data: { currentPeriodEnd: next, renewalRemindersSent: [] as unknown as Prisma.InputJsonValue },
          });
          await tx.transaction.create({
            data: {
              userId: r.userId, type: "rental_payment",
              amount: new Prisma.Decimal(price).negated(), rentalId: r.id,
              description: `Monthly renewal for ${r.linkedinAccount.linkedinName}`,
            },
          });
        });
        try { await sendRenewalConfirmation(r.user.email); } catch (e) { console.error(e); }
        result.renewed++;
      } else {
        await prisma.rental.update({ where: { id: r.id }, data: { status: "payment_failed" } });
        try { await revokeRentalAccess(r.id); } catch (e) { console.error("revoke on payment_failed", r.id, e); }
        try { await sendAccessRevokedEmail(r.user.email, firstNameOf(r.user.fullName), `${APP_URL}/api/rentals/${r.id}/renew`); } catch (e) { console.error(e); }
        result.failed++;
      }
    }

    // 2) Manual-renewal cadence — auto-renew OFF rentals (active or recently expired).
    const manual = await prisma.rental.findMany({
      where: { autoRenew: false, status: { in: ["active", "expired"] } },
      include: { user: true, linkedinAccount: true },
    });
    for (const r of manual) {
      if (!r.currentPeriodEnd) continue;
      const end = new Date(r.currentPeriodEnd);
      const sent = Array.isArray(r.renewalRemindersSent) ? (r.renewalRemindersSent as string[]) : [];
      const renewUrl = `${APP_URL}/api/rentals/${r.id}/renew`;
      const first = firstNameOf(r.user.fullName);
      const amount = `$${Number(r.lockedPrice ?? r.linkedinAccount.monthlyPrice).toFixed(0)}`;
      const markSent = (stage: string) =>
        prisma.rental.update({ where: { id: r.id }, data: { renewalRemindersSent: [...sent, stage] as unknown as Prisma.InputJsonValue } });

      // Reminder — within 3 days before the end date.
      if (r.status === "active" && now < end && end.getTime() - now.getTime() <= 3 * DAY && !sent.includes("reminder_3d")) {
        try { await sendRenewalReminder3d(r.user.email, first, renewUrl, fmtDate(end), amount); await markSent("reminder_3d"); result.reminded++; } catch (e) { console.error(e); }
        continue;
      }
      // Grace notice — on/after expiry, still within the 24h grace window.
      if (r.status === "active" && now >= end && now < new Date(end.getTime() + DAY) && !sent.includes("grace")) {
        try { await sendRenewalGraceNotice(r.user.email, first, renewUrl, fmtDate(new Date(end.getTime() + DAY)), amount); await markSent("grace"); result.graceNoticed++; } catch (e) { console.error(e); }
        continue;
      }
      // Lapse — grace window passed, still unpaid → revoke + expire.
      if (r.status === "active" && now >= new Date(end.getTime() + DAY)) {
        await prisma.rental.update({ where: { id: r.id }, data: { status: "expired" } });
        try { await revokeRentalAccess(r.id); } catch (e) { console.error("revoke on lapse", r.id, e); }
        result.lapsed++;
        continue;
      }
      // Soft win-back — 7 days after expiry, final touch.
      if (r.status === "expired" && now >= new Date(end.getTime() + 7 * DAY) && !sent.includes("winback")) {
        try { await sendRenewalWinBack(r.user.email, first, renewUrl, amount); await markSent("winback"); result.winBack++; } catch (e) { console.error(e); }
        continue;
      }
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Renewal cron error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
