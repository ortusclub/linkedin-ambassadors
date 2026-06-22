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
      inventoryAccounts,
      totalCustomers,
      activeRentalsList,
    ] = await Promise.all([
      // Real inventory only — exclude removed/retired AND showcase/dummy accounts.
      prisma.linkedInAccount.findMany({
        where: { status: { notIn: ["removed", "retired"] } },
        select: { status: true, notes: true },
      }),
      // Customers who have actually rented (a signup with zero rentals isn't a customer yet).
      prisma.user.count({ where: { role: "customer", status: "active", ...liveUser, rentals: { some: {} } } }),
      prisma.rental.findMany({
        where: activeWhere,
        include: {
          user: { select: { fullName: true, email: true, isTest: true } },
          linkedinAccount: { select: { linkedinName: true, monthlyPrice: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const realAccounts = inventoryAccounts.filter((a) => !(a.notes || "").includes("[SHOWCASE]"));
    const totalAccounts = realAccounts.length;
    const availableAccounts = realAccounts.filter((a) => a.status === "available").length;

    const activeRentals = activeRentalsList.length;
    // Rented inventory == live active rentals (so a test-held account doesn't inflate it).
    const rentedAccounts = activeRentals;
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
