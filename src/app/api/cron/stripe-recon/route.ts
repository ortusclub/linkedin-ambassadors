import { NextRequest, NextResponse } from "next/server";
import { reconcileStripe } from "@/services/stripe-reconcile";
import { sendReconciliationSummary } from "@/services/email";

// Daily Stripe -> ledger reconciliation. Detect-only (never writes the ledger); it
// emails the team when Stripe collected money our transactions don't account for, so
// nothing slips through silently. Posting is a human action via Admin -> Transactions.
// Vercel cron hits it via GET.

const RECON_TO = process.env.RECON_ALERT_EMAIL || "milee@linkedvelocity.com";

function isAuthorized(req: NextRequest): boolean {
  if (req.headers.get("x-vercel-cron")) return true;
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

async function run(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const data = await reconcileStripe({ sinceDays: 60 });
    if (data.gapCount > 0) await sendReconciliationSummary(RECON_TO, data);
    return NextResponse.json({
      ok: true,
      emailed: data.gapCount > 0 ? RECON_TO : null,
      window: `${data.windowDays}d`,
      charges: data.chargeCount,
      collected: Number(data.collected.toFixed(2)),
      accounted: data.accountedCount,
      gaps: data.gapCount,
      gapTotal: Number(data.gapTotal.toFixed(2)),
    });
  } catch (e) {
    console.error("stripe-recon cron error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) { return run(req); }
export async function POST(req: NextRequest) { return run(req); }
