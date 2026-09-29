import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// The customer's credit top-ups (money added to their wallet) — for the "Previous payments"
// section, each with a downloadable PDF receipt at /api/wallet/receipt/[id].
export async function GET() {
  try {
    const user = await requireAuth();
    const rows = await prisma.transaction.findMany({
      where: { userId: user.id, type: "deposit" },
      orderBy: { createdAt: "desc" },
      select: { id: true, amount: true, txHash: true, description: true, createdAt: true },
    });
    const payments = rows.map((t) => ({
      id: t.id,
      amount: Number(t.amount).toFixed(2),
      method: t.txHash ? "Crypto (USDC)" : "Card",
      reference: t.txHash || t.id,
      description: t.description || "Credit top-up",
      createdAt: t.createdAt.toISOString(),
    }));
    return NextResponse.json({ payments });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
