import { Resend } from "resend";

// Do not use the general email logger: these messages contain verification secrets.
export async function onboardingMailRequest(path: string, body?: unknown, idempotencyKey?: string) {
  if (!process.env.RESEND_API_KEY) throw new Error("Email provider not configured");
  const response = await fetch(`https://api.resend.com${path}`, {
    method: body ? "POST" : "GET", cache: "no-store", signal: AbortSignal.timeout(15000),
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json", ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) throw new Error(`Email provider request failed (${response.status})`);
  return response.json();
}

export function verifyInbound(payload: string, headers: Headers) {
  const secret = process.env.RESEND_INBOUND_WEBHOOK_SECRET;
  if (!secret) throw new Error("Inbound not configured");
  return new Resend(process.env.RESEND_API_KEY).webhooks.verify({ payload, webhookSecret: secret,
    headers: { id: headers.get("svix-id") || "", timestamp: headers.get("svix-timestamp") || "", signature: headers.get("svix-signature") || "" } });
}
