import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Reversible encryption for account secrets we must USE (LinkedIn password, 2FA
// secret), not just verify. AES-256-GCM. The key lives in CREDENTIAL_ENCRYPTION_KEY
// (32 bytes, base64) in the environment / KMS, never in the database.
const PREFIX = "v1:"; // version tag so the algo/key can be rotated later

function key(): Buffer {
  const raw = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!raw) throw new Error("CREDENTIAL_ENCRYPTION_KEY is not set");
  const k = Buffer.from(raw, "base64");
  if (k.length !== 32) throw new Error("CREDENTIAL_ENCRYPTION_KEY must be 32 bytes, base64-encoded");
  return k;
}

// Encrypt a secret for storage. Returns "v1:<base64(iv|tag|ciphertext)>".
// null/empty in -> null/empty out (nothing to protect).
export function encryptSecret(plain: string | null | undefined): string | null {
  if (plain == null || plain === "") return plain ?? null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

// Decrypt. LEGACY-TOLERANT: a value without the prefix is treated as plaintext and
// returned unchanged, so existing rows keep working before the backfill runs.
export function decryptSecret(stored: string | null | undefined): string | null {
  if (stored == null || stored === "") return stored ?? null;
  if (!stored.startsWith(PREFIX)) return stored; // legacy plaintext
  const buf = Buffer.from(stored.slice(PREFIX.length), "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export function isEncrypted(v: string | null | undefined): boolean {
  return !!v && v.startsWith(PREFIX);
}
