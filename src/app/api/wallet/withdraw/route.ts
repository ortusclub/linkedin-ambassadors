import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet address"),
  amount: z.string().refine((v) => parseFloat(v) > 0, "Amount must be positive"),
});

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { address, amount } = schema.parse(body);
    const withdrawAmount = parseFloat(amount);

    // Check balance
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: { usdcBalance: true },
    });

    if (!userData || parseFloat(userData.usdcBalance.toString()) < withdrawAmount) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    // Deduct balance and record transaction
    // Note: actual on-chain transfer would be processed by admin/cron
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { usdcBalance: { decrement: withdrawAmount } },
      });

      await tx.transaction.create({
        data: {
          userId: user.id,
          type: "refund",
          amount: -withdrawAmount,
          description: `Withdrawal request to ${address}`,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }
    console.error("Withdraw error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
