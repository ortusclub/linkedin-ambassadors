import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    await requireAdmin();

    const { userId, amount, description } = await req.json();

    if (!userId || !amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid user or amount" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Credit the user's balance and record a transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { usdcBalance: { increment: amount } },
      }),
      prisma.transaction.create({
        data: {
          userId,
          type: "adjustment",
          amount,
          description: description || `Payment to ${user.fullName}`,
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && (error.message === "Forbidden" || error.message === "Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Payment error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
