"use client";
import { useEffect, useState } from "react";
import styles from "./wizard.module.css";

// A 2FA authenticator built into the wizard so the owner doesn't have to leave for a
// separate app. They enable authenticator-app 2FA on LinkedIn, reveal the setup KEY,
// paste it here, and we show the live 6-digit code (RFC 6238 TOTP) to type back into
// LinkedIn. The same saved key later lets the team generate codes at sign-in — so
// LinkedIn asks for a code instead of pushing a device confirmation to the owner's phone.

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

// Decode an RFC 4648 base32 secret (LinkedIn shows it grouped, sometimes lower-case).
export function base32Decode(input: string): Uint8Array | null {
  const clean = input.toUpperCase().replace(/[\s=]/g, "");
  if (!clean) return null;
  let bits = 0, value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx === -1) return null; // not a valid base32 secret
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 0xff); bits -= 8; }
  }
  return new Uint8Array(out);
}

// A key long enough to be a real TOTP secret (LinkedIn's are 16+ base32 chars → 10+ bytes).
export function looksLikeTotpKey(key: string): boolean {
  const s = base32Decode(key);
  return !!s && s.length >= 10;
}

async function totpCode(secret: Uint8Array, period = 30, digits = 6): Promise<string> {
  const counter = Math.floor(Date.now() / 1000 / period);
  const buf = new ArrayBuffer(8);
  // Low 32 bits hold the counter (~5.7e7 today); the high 32 bits stay 0 for centuries.
  new DataView(buf).setUint32(4, counter);
  const key = await crypto.subtle.importKey("raw", secret as unknown as ArrayBuffer, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, buf));
  const offset = sig[sig.length - 1] & 0x0f;
  const code = ((sig[offset] & 0x7f) << 24) | (sig[offset + 1] << 16) | (sig[offset + 2] << 8) | sig[offset + 3];
  return (code % 10 ** digits).toString().padStart(digits, "0");
}

export default function TotpCode({ secretKey }: { secretKey: string }) {
  const [code, setCode] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(30);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const secret = base32Decode(secretKey);
    if (!secret || secret.length < 10) { setCode(null); return; }
    let active = true;
    let lastWindow = -1;
    const tick = async () => {
      const now = Math.floor(Date.now() / 1000);
      if (active) setRemaining(30 - (now % 30));
      const win = Math.floor(now / 30);
      if (win !== lastWindow) {
        lastWindow = win;
        try { const c = await totpCode(secret); if (active) setCode(c); }
        catch { if (active) setCode(null); }
      }
    };
    void tick();
    const id = setInterval(() => void tick(), 1000);
    return () => { active = false; clearInterval(id); };
  }, [secretKey]);

  if (!looksLikeTotpKey(secretKey) || !code) return null;

  const copy = () => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className={styles.totpCard}>
      <div className={styles.totpHead}>
        <span className={styles.totpLabel}>TYPE THIS CODE INTO LINKEDIN · NEW CODE IN {remaining}S</span>
      </div>
      <div className={styles.totpRow}>
        <span className={styles.totpCode}>{code.slice(0, 3)} {code.slice(3)}</span>
        <button type="button" className={styles.totpCopy} onClick={copy}>{copied ? "Copied ✓" : "Copy code"}</button>
      </div>
      <div className={styles.totpBarTrack}><span className={styles.totpBar} style={{ width: `${(remaining / 30) * 100}%` }} /></div>
    </div>
  );
}
