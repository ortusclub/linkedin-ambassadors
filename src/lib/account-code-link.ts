import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { EmailSetupError } from "@/lib/onboarding-email-policy";
const TTL = 24 * 60 * 60 * 1000;
function sign(payload: string) {
  const secret = process.env.ONBOARDING_EMAIL_CODE_SECRET;
  if (!secret) throw new EmailSetupError("Account code links are temporarily unavailable.", 503);
  return createHmac("sha256", secret).update(`account-code:v1:${payload}`).digest("base64url");
}
export function createAccountCodeLink(id: string, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ id, expires: now + TTL, nonce: randomBytes(16).toString("hex") })).toString("base64url");
  return `https://linkedvelocity.com/account-code#access=${payload}.${sign(payload)}`;
}
export function readAccountCodeLink(token: string, now = Date.now()): string {
  const deny = () => new EmailSetupError("This private link is invalid or expired. Ask our team for a new link.", 403);
  if (token.length > 1000) throw deny();
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) throw deny();
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw deny();
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof data.id !== "string" || !/^[a-f0-9-]{36}$/i.test(data.id) || !Number.isFinite(data.expires) || data.expires <= now || data.expires > now + TTL) throw deny();
    return data.id;
  } catch { throw deny(); }
}
