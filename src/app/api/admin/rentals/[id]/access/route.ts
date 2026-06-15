import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { grantRentalAccess, revokeRentalAccess } from "@/lib/rental-access";

// Manage a rental's renter GoLogin access.
// Body: { action: "grant" | "revoke" | "end" }
//   grant  = (re)share access — used by Grant + Resume
//   revoke = cut access, mark Paused (temporary — can Resume)
//   end    = cut access, mark the rental Cancelled (permanent)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const { action } = await req.json();
    if (action !== "grant" && action !== "revoke" && action !== "end") {
      return NextResponse.json({ error: "action must be 'grant', 'revoke', or 'end'" }, { status: 400 });
    }

    if (action === "grant") {
      const { shareId, email } = await grantRentalAccess(id);
      return NextResponse.json({ ok: true, action, shareId, sharedWith: email });
    }

    const revoked = await revokeRentalAccess(id);
    if (action === "revoke") {
      await prisma.rental.update({ where: { id }, data: { paused: true } });
    } else {
      // end: permanent — mark cancelled, not paused
      await prisma.rental.update({ where: { id }, data: { paused: false, status: "cancelled" } });
    }
    return NextResponse.json({ ok: true, action, revoked });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    if (msg === "Forbidden" || msg === "Unauthorized") {
      return NextResponse.json({ error: msg }, { status: msg === "Forbidden" ? 403 : 401 });
    }
    console.error("Rental access action error:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
