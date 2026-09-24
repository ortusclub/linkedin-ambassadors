import { createHmac, randomInt, timingSafeEqual } from "crypto";

// Stateless email-verification gate for the public DIY self-onboarding page. A person must
// prove they control the email they entered BEFORE we provision anything (proxy + GoLogin),
// so a bot can't hammer the public page and burn real cost. No DB rows: everything is a
// signed, expiring blob, keyed on ONBOARDING_EMAIL_CODE_SECRET (already set in prod).

function secret(): string {
  const s = process.env.ONBOARDING_EMAIL_CODE_SECRET;
  if (!s) throw new Error("gate not configured");
  return s;
}
function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}
function safeEq(a: string, b: string): boolean {
  const ab = Buffer.from(a), bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
function b64(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}
function unb64<T>(s: string): T | null {
  try { return JSON.parse(Buffer.from(s, "base64url").toString("utf8")) as T; } catch { return null; }
}

const CHALLENGE_TTL_MS = 10 * 60 * 1000; // 10 min to enter the code
const PERMIT_TTL_MS = 30 * 60 * 1000;    // 30 min to finish signing up after verifying

export function randomCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

// Bind a code to an email + expiry. The returned `challenge` never reveals the code (the
// code is only emailed), so only someone who received the email can pass verifyChallenge.
export function issueChallenge(email: string, code: string): string {
  const payload = b64({ e: email.toLowerCase().trim(), x: Date.now() + CHALLENGE_TTL_MS });
  return `${payload}.${sign(`challenge:${payload}:${code}`)}`;
}

export function verifyChallenge(challenge: string, email: string, code: string): boolean {
  const [payload, sig] = (challenge || "").split(".");
  if (!payload || !sig) return false;
  const data = unb64<{ e: string; x: number }>(payload);
  if (!data || data.e !== email.toLowerCase().trim() || Date.now() > data.x) return false;
  return safeEq(sig, sign(`challenge:${payload}:${code}`));
}

// Issued once the code checks out; /start requires it and re-checks the email matches.
export function issuePermit(email: string): string {
  const payload = b64({ e: email.toLowerCase().trim(), x: Date.now() + PERMIT_TTL_MS });
  return `${payload}.${sign(`permit:${payload}`)}`;
}

export function verifyPermit(permit: string, email: string): boolean {
  const [payload, sig] = (permit || "").split(".");
  if (!payload || !sig) return false;
  const data = unb64<{ e: string; x: number }>(payload);
  if (!data || data.e !== email.toLowerCase().trim() || Date.now() > data.x) return false;
  return safeEq(sig, sign(`permit:${payload}`));
}
