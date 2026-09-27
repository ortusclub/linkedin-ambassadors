import { createHmac, timingSafeEqual } from "node:crypto";
function sign(value: string) {
  const key = process.env.ONBOARDING_EMAIL_CODE_SECRET;
  if (!key) throw new Error("Meeting booking is not configured");
  return createHmac("sha256", key).update(`meeting:${value}`).digest("hex");
}
export function meetingToken(applicationId: string) {
  const payload = Buffer.from(JSON.stringify({ id: applicationId, expires: Date.now() + 86400000 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}
export function meetingApplication(token: string): string | null {
  try {
    const [payload, signature, extra] = token.split(".");
    if (extra || !payload || !signature) return null;
    const expected = Buffer.from(sign(payload)), actual = Buffer.from(signature);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
    const value = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof value.id === "string" && /^[0-9a-f-]{36}$/i.test(value.id) && value.expires > Date.now() ? value.id : null;
  } catch { return null; }
}
