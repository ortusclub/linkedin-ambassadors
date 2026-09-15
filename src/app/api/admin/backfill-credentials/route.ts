import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { encryptSecret, isEncrypted } from "@/lib/crypto-creds";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// One-off: encrypt any account password / 2FA secret still stored as plain text.
// Idempotent — already-encrypted (v1:) values are skipped, so it's safe to re-run.
// Admin-only. Also proves the CREDENTIAL_ENCRYPTION_KEY works in prod.
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
      if (a.accountPassword && a.accountPassword !== "" && !isEncrypted(a.accountPassword)) {
        data.accountPassword = encryptSecret(a.accountPassword)!;
        passwords++;
      }
      if (a.twoFactor && a.twoFactor !== "" && !isEncrypted(a.twoFactor)) {
        data.twoFactor = encryptSecret(a.twoFactor)!;
        twoFactors++;
      }
      if (Object.keys(data).length) await prisma.linkedInAccount.update({ where: { id: a.id }, data });
    }
    return NextResponse.json({ ok: true, scanned: accounts.length, passwordsEncrypted: passwords, twoFactorsEncrypted: twoFactors });
  } catch (error) {
    if (error instanceof Error && (error.message === "Forbidden" || error.message === "Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Credential backfill failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "Backfill failed" }, { status: 500 });
  }
}
