import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// Captured LinkedIn account-security emails for one account, newest first, plus a summary strip.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const events = await prisma.accountMailEvent.findMany({
      where: { linkedinAccountId: id },
      orderBy: { receivedAt: "desc" },
      take: 200,
      select: {
        id: true, receivedAt: true, fromAddr: true, subject: true, bodyText: true,
        type: true, severity: true, status: true, locationLabel: true,
      },
    });
    const summary = {
      logged: events.filter((e) => e.status === "logged").length,
      needReview: events.filter((e) => e.status === "needs_review").length,
      incidents: events.filter((e) => e.status === "incident").length, // populated in phase 3
    };
    return NextResponse.json({ events, summary });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    const code = msg === "Forbidden" ? 403 : msg === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
