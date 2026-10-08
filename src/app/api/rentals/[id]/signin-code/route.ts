import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto-creds";
import { generateTotp } from "@/lib/totp";

// Renter-facing live 2FA code for an account they rent — ONLY for renters with tiered
// credential access (User.credentialAccess). This is a dedicated renter path: it requires
// the flag and that the caller owns a CURRENT rental of the account (active / pending /
// payment_failed — shadow included, since the flag is an explicit opt-in), so the
// owner/referrer gate in owner-sign-in-code.ts (which blocks codes for rented accounts)
// stays untouched. Returns the current TOTP code + when it rolls over.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    if (!user.credentialAccess) {
      return NextResponse.json({ error: "Credential access is not enabled for your account." }, { status: 403 });
    }

    const rental = await prisma.rental.findFirst({
      where: {
        id,
        userId: user.id,
        // Any account they currently rent (shadow included — credentialAccess is an explicit
        // per-renter opt-in). Excludes expired/cancelled rentals.
        status: { in: ["active", "pending_access", "payment_failed"] },
      },
      select: {
        linkedinAccount: { select: { twoFactor: true, loginEmail: true, removedAt: true } },
      },
    });

    if (!rental || rental.linkedinAccount.removedAt) {
      return NextResponse.json({ error: "Rental not found" }, { status: 404 });
    }

    const secret = (decryptSecret(rental.linkedinAccount.twoFactor) || "").replace(/\s/g, "");
    if (!/^[A-Z2-7]{16,}={0,6}$/i.test(secret)) {
      return NextResponse.json(
        { error: "No 2FA is set up for this account — contact our team." },
        { status: 409 }
      );
    }

    const { code, expiresIn } = generateTotp(secret);
    return NextResponse.json({ code, expiresAt: Date.now() + expiresIn * 1000 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("renter signin-code error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
