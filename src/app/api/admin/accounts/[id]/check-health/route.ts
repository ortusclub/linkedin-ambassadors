import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const account = await prisma.linkedInAccount.findUnique({ where: { id } });
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Admin manually sets the health status
    const health = body.health === "active" ? "active"
      : body.health === "restricted" ? "restricted"
      : body.health === "not_found" ? "not_found"
      : "unknown";

    const updated = await prisma.linkedInAccount.update({
      where: { id },
      data: {
        linkedinAccountHealth: health,
        healthCheckedAt: new Date(),
      },
    });

    return NextResponse.json({
      health: updated.linkedinAccountHealth,
      checkedAt: updated.healthCheckedAt,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
