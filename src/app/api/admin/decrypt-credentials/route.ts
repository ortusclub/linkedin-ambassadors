import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { decryptSecret, isEncrypted } from "@/lib/crypto-creds";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// One-off REVERSE of the backfill: decrypt any account password / 2FA still stored
// encrypted (v1:) back to plain text, so the values are viewable everywhere (DB,
// exports, Sheets) again. Idempotent — plain values are skipped. Admin-only.
export async function POST() {
  try {
    await requireAdmin();
    const accounts = await prisma.linkedInAccount.findMany({
      where: { OR: [{ accountPassword: { not: null } }, { twoFactor: { not: null } }] },
      select: { id: true, accountPassword: true, twoFactor: true },
    });
    let passwords = 0;
    let twoFactors = 0;
    for (const a of accounts) {
      const data: { accountPassword?: string; twoFactor?: string } = {};
      if (isEncrypted(a.accountPassword)) { data.accountPassword = decryptSecret(a.accountPassword)!; passwords++; }
      if (isEncrypted(a.twoFactor)) { data.twoFactor = decryptSecret(a.twoFactor)!; twoFactors++; }
      if (Object.keys(data).length) await prisma.linkedInAccount.update({ where: { id: a.id }, data });
    }
    return NextResponse.json({ ok: true, scanned: accounts.length, passwordsDecrypted: passwords, twoFactorsDecrypted: twoFactors });
  } catch (error) {
    if (error instanceof Error && (error.message === "Forbidden" || error.message === "Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Credential decrypt failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "Decrypt failed" }, { status: 500 });
  }
}
