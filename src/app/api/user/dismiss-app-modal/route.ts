import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function POST() {
  try {
    const user = await requireAuth();
    const dismissUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await prisma.user.update({
      where: { id: user.id },
      data: { dismissAppModalUntil: dismissUntil },
    });

    return NextResponse.json({ dismissed: true, until: dismissUntil });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function GET() {
  try {
    const user = await requireAuth();
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { dismissAppModalUntil: true },
    });

    const dismissed = fullUser?.dismissAppModalUntil && fullUser.dismissAppModalUntil > new Date();
    return NextResponse.json({ dismissed: !!dismissed });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
