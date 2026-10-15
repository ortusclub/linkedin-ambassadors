import { NextRequest, NextResponse } from "next/server";
import { detectDeposits, sweepDeposits } from "@/lib/deposit-detector";
import { withDepositJob, DepositJobBusy } from "@/lib/deposit-job";

export const maxDuration = 300;

function isAuthorized(req: NextRequest): boolean {
  // Vercel cron and manual triggers must supply the configured secret.
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`) return true;

  return false;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { deposits, sweeps } = await withDepositJob(async assertActive => {
      const deposits = await detectDeposits(assertActive);
      const sweeps = await sweepDeposits(undefined, undefined, assertActive);
      return { deposits, sweeps };
    });

    return NextResponse.json({
      deposits: deposits.length,
      sweeps: sweeps.length,
      details: { deposits, sweeps },
    });
  } catch (error) {
    if (error instanceof DepositJobBusy) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error("Deposit detection error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { deposits, sweeps } = await withDepositJob(async assertActive => {
      const deposits = await detectDeposits(assertActive);
      const sweeps = await sweepDeposits(undefined, undefined, assertActive);
      return { deposits, sweeps };
    });

    return NextResponse.json({
      deposits: deposits.length,
      sweeps: sweeps.length,
      details: { deposits, sweeps },
    });
  } catch (error) {
    if (error instanceof DepositJobBusy) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error("Deposit detection error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
