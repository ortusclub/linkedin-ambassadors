// Minimal RFC 6238 TOTP generator (server-side only) for showing the current
// LinkedIn 2FA code in the admin inventory. Secrets are stored as plain base32
// (32-char, SHA1, 30s period, 6 digits) — the Google-Authenticator default.
import { createHmac } from "crypto";

// Decode a base32 (RFC 4648) secret into raw bytes. Tolerant of spaces,
// lowercase, and "=" padding (authenticator apps show all three).
function base32Decode(input: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = input.replace(/[\s=]/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = alphabet.indexOf(ch);
    if (idx === -1) continue; // skip anything not in the base32 alphabet
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((value >>> bits) & 0xff);
    }
  }
  return Buffer.from(out);
}

export interface TotpResult {
  code: string;      // zero-padded 6-digit code
  period: number;    // step length in seconds (30)
  expiresIn: number; // seconds until this code rolls over
}

// Generate the current TOTP code for a base32 secret. `nowMs` is injectable for
// tests; defaults to the real clock.
export function generateTotp(secret: string, nowMs: number = Date.now()): TotpResult {
  const period = 30;
  const digits = 6;
  const key = base32Decode(secret);
  if (key.length === 0) throw new Error("Empty or invalid 2FA secret");

  const counter = Math.floor(nowMs / 1000 / period);
  const buf = Buffer.alloc(8);
  // 64-bit big-endian counter (top 32 bits are effectively 0 until year ~10889).
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);

  const hmac = createHmac("sha1", key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binCode =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const code = (binCode % 10 ** digits).toString().padStart(digits, "0");

  const expiresIn = period - Math.floor((nowMs / 1000) % period);
  return { code, period, expiresIn };
}
