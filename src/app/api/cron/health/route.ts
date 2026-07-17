import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DAY = 24 * 60 * 60 * 1000;

// Lightweight public health probe for the daily renewal cron (process-renewals).
// If that job is firing, no active auto-renew rental should sit more than a few days past its
// period end — it'd be charged, moved into the dunning grace, or expired. The grace window is
// 3 days, so anything still "active" and >4 days overdue means the cron almost certainly isn't
// running. Returns only aggregate counts (no PII), so it's safe to expose unauthenticated for
// an external watchdog to poll.
export async function GET() {
  const now = new Date();
  const cutoff = new Date(now.getTime() - 4 * DAY);
  const [stuck, activeAutoRenew] = await Promise.all([
    prisma.rental.count({
      where: { autoRenew: true, status: "active", currentPeriodEnd: { lt: cutoff } },
    }),
    prisma.rental.count({ where: { autoRenew: true, status: "active" } }),
  ]);
  return NextResponse.json({
    ok: stuck === 0,
    stuckRentals: stuck,
    activeAutoRenewRentals: activeAutoRenew,
    note: stuck === 0 ? "renewal cron looks healthy" : "renewal cron may not be running — stuck renewals detected",
    checkedAt: now.toISOString(),
  });
}
