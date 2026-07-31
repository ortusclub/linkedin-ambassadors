import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Called by the Mac-side WhatsApp agent after it delivers an overdue reminder —
// stamps lastNudgeAt so repeat scans within the cooldown don't re-queue it.
export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  if (req.headers.get("x-vercel-cron")) return true;
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { accountId } = (await req.json()) as { accountId?: string };
    if (!accountId) return NextResponse.json({ error: "accountId required" }, { status: 400 });
    await prisma.linkedInAccount.update({ where: { id: accountId }, data: { lastNudgeAt: new Date() } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("whatsapp-sent error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
