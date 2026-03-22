import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireAuth();

    const rentals = await prisma.rental.findMany({
      where: { userId: user.id },
      include: {
        linkedinAccount: {
          select: {
            id: true,
            linkedinName: true,
            linkedinHeadline: true,
            profilePhotoUrl: true,
            connectionCount: true,
            gologinShareLink: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ rentals });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
