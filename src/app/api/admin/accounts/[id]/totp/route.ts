import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { generateTotp } from "@/lib/totp";

// GET /api/admin/accounts/[id]/totp — return the CURRENT LinkedIn 2FA code for
// an account, computed server-side from the stored base32 secret. The secret
// itself never leaves the server; only the live 6-digit code + a countdown do.
// Admin-only.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const account = await prisma.linkedInAccount.findUnique({
      where: { id },
      select: { twoFactor: true },
    });
    if (!account) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const secret = (account.twoFactor || "").trim();
    if (!secret) {
      return NextResponse.json({ configured: false });
    }
    try {
      const { code, period, expiresIn } = generateTotp(secret);
      return NextResponse.json({ configured: true, code, period, expiresIn });
    } catch {
      // Secret present but not valid base32 — likely a note/URI, not a raw key.
      return NextResponse.json({ configured: true, invalid: true });
    }
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
