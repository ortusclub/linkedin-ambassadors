import { createHmac, timingSafeEqual } from "crypto";

const TEN_MINUTES = 10 * 60 * 1000;

export class PhoneVerificationError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export function phoneVerificationConfigured(): boolean {
  return !!(process.env.TWILIO_ACCOUNT_SID?.trim() && process.env.TWILIO_AUTH_TOKEN?.trim() &&
    process.env.TWILIO_VERIFY_SERVICE_SID?.trim() && process.env.PHONE_VERIFICATION_SECRET?.trim());
}

export function normalizePhone(value: string): string {
  const phone = value.replace(/[\s()-]/g, "");
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    throw new PhoneVerificationError("Enter a valid mobile number with its country code, for example +63 912 345 6789.");
  }
  return phone;
}

function config() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID?.trim();
  const signingSecret = process.env.PHONE_VERIFICATION_SECRET?.trim();
  if (!accountSid || !authToken || !serviceSid || !signingSecret) {
    throw new PhoneVerificationError("Mobile verification is not configured yet. Ask the LinkedVelocity team to enable it.", 503);
  }
  return { accountSid, authToken, serviceSid, signingSecret };
}

async function twilio(path: string, body: URLSearchParams) {
  const cfg = config();
  const response = await fetch(`https://verify.twilio.com/v2/Services/${encodeURIComponent(cfg.serviceSid)}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${cfg.accountSid}:${cfg.authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({})) as { status?: string; message?: string };
  if (!response.ok) throw new PhoneVerificationError(data.message || "The verification service could not process this number.", response.status >= 500 ? 502 : 400);
  return data;
}

export async function sendPhoneVerification(value: string) {
  const phone = normalizePhone(value);
  await twilio("Verifications", new URLSearchParams({ To: phone, Channel: "sms" }));
  return phone;
}

export async function checkPhoneVerification(value: string, code: string, referrerId: string) {
  const phone = normalizePhone(value);
  if (!/^\d{4,10}$/.test(code.trim())) throw new PhoneVerificationError("Enter the verification code from the SMS.");
  const result = await twilio("VerificationCheck", new URLSearchParams({ To: phone, Code: code.trim() }));
  if (result.status !== "approved") throw new PhoneVerificationError("That code is incorrect or has expired.");
  return createPhoneVerificationToken(phone, referrerId);
}

function createPhoneVerificationToken(phone: string, referrerId: string): string {
  const { signingSecret } = config();
  const payload = Buffer.from(JSON.stringify({ phone, referrerId, expiresAt: Date.now() + TEN_MINUTES })).toString("base64url");
  const signature = createHmac("sha256", signingSecret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function assertPhoneVerificationToken(token: string, value: string, referrerId: string) {
  const { signingSecret } = config();
  const [payload, suppliedSignature] = token.split(".");
  if (!payload || !suppliedSignature) throw new PhoneVerificationError("Verify the mobile number before continuing.");
  const expectedSignature = createHmac("sha256", signingSecret).update(payload).digest("base64url");
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new PhoneVerificationError("Mobile verification is invalid. Please verify the number again.");
  let proof: { phone?: string; referrerId?: string; expiresAt?: number };
  try { proof = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")); }
  catch { throw new PhoneVerificationError("Mobile verification is invalid. Please verify the number again."); }
  if (proof.phone !== normalizePhone(value) || proof.referrerId !== referrerId || !proof.expiresAt || proof.expiresAt < Date.now()) {
    throw new PhoneVerificationError("Mobile verification has expired or the number changed. Please verify it again.");
  }
}
