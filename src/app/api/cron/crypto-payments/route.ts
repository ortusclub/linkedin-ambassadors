import { NextRequest, NextResponse } from "next/server";
import { checkCryptoPayments } from "@/lib/crypto-payments";

// Daily: scan each account's off-platform payment wallet for new on-chain
// payments, record them, and nudge renters who've fallen behind the daily rate.
// See src/lib/crypto-payments.ts.
export const dynamic = "force-dynamic";
export const maxDuration = 300; // chain scans are chunked & rate-limited — give them room

function isAuthorized(req: NextRequest): boolean {
  // Vercel cron sends this header automatically
  if (req.headers.get("x-vercel-cron")) return true;
  // Manual trigger with CRON_SECRET
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const results = await checkCryptoPayments();
    return NextResponse.json({
      checked: results.length,
      newPayments: results.reduce((s, r) => s + r.newPayments.length, 0),
      overdue: results.filter((r) => r.overdue).map((r) => r.accountName),
      results,
    });
  } catch (error) {
    console.error("crypto-payments cron error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
