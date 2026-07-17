import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendRenewalCronAlert } from "@/services/email";

const DAY = 24 * 60 * 60 * 1000;

// Watchdog for the daily renewal cron. Runs shortly after process-renewals; if any active
// auto-renew rental is stuck >4 days past its period end (beyond the 3-day grace), the renewal
// job almost certainly isn't running, so it emails milee@ an alert. Quiet when healthy.
async function handle(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const now = new Date();
  const cutoff = new Date(now.getTime() - 4 * DAY);
  const [stuck, activeAutoRenew] = await Promise.all([
    prisma.rental.count({ where: { autoRenew: true, status: "active", currentPeriodEnd: { lt: cutoff } } }),
    prisma.rental.count({ where: { autoRenew: true, status: "active" } }),
  ]);
  let alerted = false;
  if (stuck > 0) {
    try { await sendRenewalCronAlert(stuck, activeAutoRenew); alerted = true; } catch (e) { console.error("watchdog alert failed", e); }
  }
  return NextResponse.json({ ok: stuck === 0, stuck, activeAutoRenew, alerted });
}

// Vercel Cron triggers with GET; keep POST for manual runs.
export async function GET(req: NextRequest) { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }
