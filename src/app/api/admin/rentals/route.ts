import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();

    const rentals = await prisma.rental.findMany({
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        linkedinAccount: {
          select: { id: true, linkedinName: true, connectionCount: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ rentals });
  } catch (error) {
    if (error instanceof Error && (error.message === "Forbidden" || error.message === "Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: error.message === "Forbidden" ? 403 : 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
