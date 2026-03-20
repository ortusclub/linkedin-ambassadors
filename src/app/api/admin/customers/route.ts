import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();

    const customers = await prisma.user.findMany({
      where: { role: "customer" },
      include: {
        rentals: {
          select: { id: true, status: true },
        },
        _count: {
          select: { rentals: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = customers.map((c) => ({
      id: c.id,
      fullName: c.fullName,
      email: c.email,
      contactNumber: c.contactNumber,
      status: c.status,
      createdAt: c.createdAt,
      activeRentals: c.rentals.filter((r) => r.status === "active").length,
      totalRentals: c._count.rentals,
    }));

    return NextResponse.json({ customers: result });
  } catch (error) {
    if (error instanceof Error && (error.message === "Forbidden" || error.message === "Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: error.message === "Forbidden" ? 403 : 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
