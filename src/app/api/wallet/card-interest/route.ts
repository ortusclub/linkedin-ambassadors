import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST() {
  const session = await getSession();

  console.log(`[CARD_INTEREST] User ${session?.id ?? "anonymous"} clicked "Buy USDC with Card" at ${new Date().toISOString()}`);

  if (session?.id) {
    await prisma.transaction.create({
      data: {
        userId: session.id,
        type: "adjustment",
        amount: 0,
        description: "card_interest_click",
      },
    });
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const session = await getSession();
  if (!session?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const count = await prisma.transaction.count({
    where: { type: "adjustment", amount: 0, description: "card_interest_click" },
  });

  const uniqueUsers = await prisma.transaction.groupBy({
    by: ["userId"],
    where: { type: "adjustment", amount: 0, description: "card_interest_click" },
  });

  return NextResponse.json({ totalClicks: count, uniqueUsers: uniqueUsers.length });
}
