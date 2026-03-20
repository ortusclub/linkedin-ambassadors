import { NextRequest, NextResponse } from "next/server";
import { detectDeposits, sweepDeposits } from "@/lib/deposit-detector";

function isAuthorized(req: NextRequest): boolean {
  // Vercel cron sends this header automatically
  const vercelCron = req.headers.get("x-vercel-cron");
  if (vercelCron) return true;

  // Manual trigger with CRON_SECRET
  const authHeader = req.headers.get("authorization");
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) return true;

  return false;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const deposits = await detectDeposits();
    const sweeps = await sweepDeposits();

    return NextResponse.json({
      deposits: deposits.length,
      sweeps: sweeps.length,
      details: { deposits, sweeps },
    });
  } catch (error) {
    console.error("Deposit detection error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const deposits = await detectDeposits();
    const sweeps = await sweepDeposits();

    return NextResponse.json({
      deposits: deposits.length,
      sweeps: sweeps.length,
      details: { deposits, sweeps },
    });
  } catch (error) {
    console.error("Deposit detection error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
