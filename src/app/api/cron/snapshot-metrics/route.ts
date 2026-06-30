import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeCoreMetrics } from "@/lib/metrics";

function isAuthorized(req: NextRequest): boolean {
  if (req.headers.get("x-vercel-cron")) return true; // Vercel cron sends this automatically
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

// Record one snapshot per calendar day (UTC). Re-running the same day overwrites it,
// so the value reflects the latest run of that day.
async function run() {
  const m = await computeCoreMetrics();
  const now = new Date();
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return prisma.metricsSnapshot.upsert({
    where: { date: day },
    create: { date: day, ...m },
    update: { ...m },
  });
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const snapshot = await run();
    return NextResponse.json({ ok: true, snapshot });
  } catch (error) {
    console.error("snapshot-metrics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const POST = GET;
