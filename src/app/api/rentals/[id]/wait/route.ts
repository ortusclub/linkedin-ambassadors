import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { canReplaceNow } from "@/lib/replacement";

// Renter chooses to keep waiting for recovery instead of replacing a restricted account.
// Persisted so the admin Replacements workqueue can show "Renter waiting". Only allowed once
// the 2-day recovery hold has passed (before that there's nothing to decide).
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const rental = await prisma.rental.findFirst({
      where: { id, userId: user.id, status: { in: ["active", "pending_access", "payment_failed"] } },
      select: { id: true, linkedinAccount: { select: { restrictedAt: true } } },
    });
    if (!rental) return NextResponse.json({ error: "Rental not found" }, { status: 404 });
    if (!rental.linkedinAccount.restrictedAt) {
      return NextResponse.json({ error: "This account isn't restricted." }, { status: 400 });
    }
    if (!canReplaceNow(rental.linkedinAccount.restrictedAt)) {
      return NextResponse.json({ error: "We're still within the recovery window." }, { status: 409 });
    }

    await prisma.rental.update({ where: { id }, data: { waitingForRecovery: true, waitChosenAt: new Date() } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("rental wait error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
