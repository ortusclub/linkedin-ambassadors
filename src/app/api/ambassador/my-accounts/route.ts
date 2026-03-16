import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireAuth();

    // Find LinkedIn accounts that belong to this ambassador
    // Ambassador accounts have notes containing the user's email
    const accounts = await prisma.linkedInAccount.findMany({
      where: {
        notes: { contains: user.email },
      },
      select: {
        id: true,
        linkedinName: true,
        linkedinHeadline: true,
        profilePhotoUrl: true,
        connectionCount: true,
        status: true,
        monthlyPrice: true,
        gologinProfileId: true,
        createdAt: true,
        rentals: {
          where: { status: "active" },
          select: { id: true, startDate: true, currentPeriodEnd: true },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ accounts });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
