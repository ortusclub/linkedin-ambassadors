import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const { autoRenew } = await req.json();

    const rental = await prisma.rental.findFirst({
      where: { id, userId: user.id, status: "active" },
    });

    if (!rental) {
      return NextResponse.json({ error: "Rental not found" }, { status: 404 });
    }

    await prisma.rental.update({
      where: { id },
      data: { autoRenew: !!autoRenew },
    });

    return NextResponse.json({ ok: true, autoRenew: !!autoRenew });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
