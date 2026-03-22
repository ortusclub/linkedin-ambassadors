import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();

    const users = await prisma.user.findMany({
      where: { role: "customer" },
      select: {
        id: true,
        fullName: true,
        email: true,
        usdcBalance: true,
        depositAddress: { select: { address: true } },
      },
      orderBy: { usdcBalance: "desc" },
    });

    const totalBalance = users.reduce(
      (sum, u) => sum + parseFloat(u.usdcBalance.toString()),
      0
    );

    return NextResponse.json({
      users: users.map((u) => ({
        ...u,
        usdcBalance: u.usdcBalance.toString(),
        depositAddress: u.depositAddress?.address || null,
      })),
      totalBalance: totalBalance.toFixed(6),
    });
  } catch (error) {
    if (error instanceof Error && (error.message === "Forbidden" || error.message === "Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
