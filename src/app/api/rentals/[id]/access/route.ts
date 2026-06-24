import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { grantRentalAccess } from "@/lib/rental-access";

// Renter-facing "Open in GoLogin": returns the public g.camp link the dashboard opens.
// If the rental has no link yet (e.g. still pending), we generate one on demand.
// Idempotent — once a link exists we just hand it back.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const rental = await prisma.rental.findUnique({
      where: { id },
      include: {
        user: { select: { email: true } },
        linkedinAccount: { select: { gologinProfileId: true } },
      },
    });
    if (!rental || rental.userId !== user.id) {
      return NextResponse.json({ error: "Rental not found" }, { status: 404 });
    }
    if (rental.paused || rental.status === "cancelled" || rental.status === "expired" || rental.status === "payment_failed") {
      return NextResponse.json({ error: "Access to this account is paused. Please contact support." }, { status: 403 });
    }

    let shareLink = rental.gologinShareLinkUrl;
    // No link yet — generate one now (works immediately; no renter GoLogin account needed).
    if (!shareLink && rental.linkedinAccount.gologinProfileId) {
      try {
        const granted = await grantRentalAccess(id);
        shareLink = granted.publicUrl;
      } catch (e) {
        console.error("renter open grant failed", id, e instanceof Error ? e.message : e);
        return NextResponse.json({ error: "Could not open this account yet. Please contact support." }, { status: 502 });
      }
    }

    return NextResponse.json({ ok: true, shareLink });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
