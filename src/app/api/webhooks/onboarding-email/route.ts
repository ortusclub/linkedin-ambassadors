import { NextResponse } from "next/server";
import { verifyInbound } from "@/services/onboarding-mail";
import { forwardOnboardingEmail } from "@/lib/onboarding-email";
import { emailSetupConfig } from "@/lib/onboarding-email-policy";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!emailSetupConfig().ready) return NextResponse.json({ error: "Receiving unavailable" }, { status: 503 });
  if (Number(req.headers.get("content-length") || 0) > 100000) return new Response(null, { status: 413 });
  const payload = await req.text();
  if (payload.length > 100000) return new Response(null, { status: 413 });
  let event;
  try { event = verifyInbound(payload, req.headers); }
  catch { return NextResponse.json({ error: "Invalid signature" }, { status: 401 }); }
  if (event.type !== "email.received") return NextResponse.json({ received: true });
  try {
    await forwardOnboardingEmail(event.data.email_id);
    return NextResponse.json({ received: true });
  } catch {
    // No message body, verification link, destination, or provider payload in logs.
    console.error("Onboarding email delivery failed; provider retry required");
    return NextResponse.json({ error: "Retry delivery" }, { status: 503 });
  }
}
