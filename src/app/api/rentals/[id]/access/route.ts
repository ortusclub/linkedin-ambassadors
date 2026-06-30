import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { grantRentalAccess, type ShareRef } from "@/lib/rental-access";

// Renter-facing "Open in GoLogin": fires the GoLogin API share (so we capture a
// share ID and access becomes revocable), then returns the link the dashboard opens.
// Idempotent — if the renter is already shared, we skip the share and just return the link.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const rental = await prisma.rental.findUnique({
      where: { id },
      include: {
        user: { select: { email: true } },
        linkedinAccount: { select: { gologinShareLink: true, gologinProfileId: true, restrictedAt: true } },
      },
    });
    if (!rental || rental.userId !== user.id) {
      return NextResponse.json({ error: "Rental not found" }, { status: 404 });
    }
    if (rental.linkedinAccount.restrictedAt) {
      return NextResponse.json({ error: "This account is temporarily restricted by LinkedIn — we're recovering it. No action needed; we'll update you." }, { status: 403 });
    }
    if (rental.paused || rental.status === "cancelled" || rental.status === "expired" || rental.status === "payment_failed") {
      return NextResponse.json({ error: "Access to this account is paused. Please contact support." }, { status: 403 });
    }

    // Only API-share once per renter email (captures the share id for revoke).
    const shares = (rental.gologinShareIds as unknown as ShareRef[] | null) || [];
    const alreadyShared = shares.some((s) => s.email === rental.user.email);
    if (!alreadyShared && rental.linkedinAccount.gologinProfileId) {
      try {
        await grantRentalAccess(id);
      } catch (e) {
        // Renter may not have a GoLogin account on this email yet, or is already shared.
        // We still hand back the link so they can open it; the auto-grant cron will
        // capture the share id later for revocability.
        console.error("renter open grant failed", id, e instanceof Error ? e.message : e);
      }
    }

    return NextResponse.json({ ok: true, shareLink: rental.linkedinAccount.gologinShareLink });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
