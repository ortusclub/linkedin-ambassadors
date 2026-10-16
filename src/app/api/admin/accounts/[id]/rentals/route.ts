import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// Full rental history for one account — every rental ever (real + shadow, active + ended),
// newest first. Powers the "Rental history" block in the Owner & activity tab.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const rentals = await prisma.rental.findMany({
      where: { linkedinAccountId: id },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true, status: true, isShadow: true, startDate: true, currentPeriodEnd: true,
        accessGrantedAt: true, accessRevokedAt: true, createdAt: true, lockedPrice: true,
        user: { select: { fullName: true, email: true } },
      },
    });
    return NextResponse.json({ rentals });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    const code = msg === "Forbidden" ? 403 : msg === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
