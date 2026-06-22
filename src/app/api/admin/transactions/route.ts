import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    // Live by default — hide test customers' transactions. ?includeTest=1 shows all.
    const includeTest = req.nextUrl.searchParams.get("includeTest") === "1";

    const transactions = await prisma.transaction.findMany({
      where: includeTest ? {} : { user: { isTest: false } },
      include: {
        user: { select: { fullName: true, email: true, isTest: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      transactions: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount.toString(),
        txHash: t.txHash,
        description: t.description,
        createdAt: t.createdAt.toISOString(),
        user: t.user,
      })),
    });
  } catch (error) {
    if (error instanceof Error && (error.message === "Forbidden" || error.message === "Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
