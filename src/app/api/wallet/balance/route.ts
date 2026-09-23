import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { isShadowRenterEmail, shadowRateFor, activeShadowAccountIds } from "@/lib/shadow-rental";

export async function GET() {
  try {
    const user = await requireAuth();
    const data = await prisma.user.findUnique({
      where: { id: user.id },
      select: { usdcBalance: true, isShadowRenter: true, email: true },
    });

    const isShadow = data?.isShadowRenter === true || isShadowRenterEmail(data?.email);
    // Accounts already shadow-bought (by any shadow renter) — shown to shadow buyers so a
    // taken account reads as unavailable to them (it stays available to everyone else).
    const shadowTakenIds = isShadow ? [...(await activeShadowAccountIds())] : [];
    return NextResponse.json({
      balance: data?.usdcBalance?.toString() || "0",
      // Shadow renters (Apex $20 / Ortus $25) are billed their own flat rate.
      isShadowRenter: isShadow,
      shadowRate: shadowRateFor(data?.email),
      shadowTakenIds,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
