import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    // Live by default: hide test customers + their rentals from the headline numbers.
    // Pass ?includeTest=1 to show everything.
    const includeTest = req.nextUrl.searchParams.get("includeTest") === "1";
    const liveUser = includeTest ? {} : { isTest: false };
    const activeWhere = { status: "active" as const, ...(includeTest ? {} : { user: { isTest: false } }) };

    const [
      totalAccounts,
      availableAccounts,
      rentedAccounts,
      totalCustomers,
      activeRentalsList,
    ] = await Promise.all([
      prisma.linkedInAccount.count({ where: { status: { not: "retired" } } }),
      prisma.linkedInAccount.count({ where: { status: "available" } }),
      prisma.linkedInAccount.count({ where: { status: "rented" } }),
      prisma.user.count({ where: { role: "customer", status: "active", ...liveUser } }),
      prisma.rental.findMany({
        where: activeWhere,
        include: {
          user: { select: { fullName: true, email: true, isTest: true } },
          linkedinAccount: { select: { linkedinName: true, monthlyPrice: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const activeRentals = activeRentalsList.length;
    // MRR from the actual prices of live active rentals (locked price if set, else list price).
    const mrr = activeRentalsList.reduce(
      (sum, r) => sum + Number(r.lockedPrice ?? r.linkedinAccount.monthlyPrice ?? 0),
      0
    );
    const recentRentals = activeRentalsList.slice(0, 10);

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
