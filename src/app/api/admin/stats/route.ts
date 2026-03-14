import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();

    const [
      totalAccounts,
      availableAccounts,
      rentedAccounts,
      activeRentals,
      totalCustomers,
      recentRentals,
    ] = await Promise.all([
      prisma.linkedInAccount.count({ where: { status: { not: "retired" } } }),
      prisma.linkedInAccount.count({ where: { status: "available" } }),
      prisma.linkedInAccount.count({ where: { status: "rented" } }),
      prisma.rental.count({ where: { status: "active" } }),
      prisma.user.count({ where: { role: "customer", status: "active" } }),
      prisma.rental.findMany({
        where: { status: "active" },
        include: {
          user: { select: { fullName: true, email: true } },
          linkedinAccount: { select: { linkedinName: true, monthlyPrice: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    const mrr = rentedAccounts * 50; // $50/account for V1

    return NextResponse.json({
      stats: {
        totalAccounts,
        availableAccounts,
        rentedAccounts,
        activeRentals,
        totalCustomers,
        mrr,
      },
      recentRentals,
    });
  } catch (error) {
    if (error instanceof Error && (error.message === "Forbidden" || error.message === "Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: error.message === "Forbidden" ? 403 : 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
