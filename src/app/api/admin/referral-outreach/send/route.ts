import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { sendReferralOutreachEmail } from "@/services/email";

// Sends ONE referral-outreach email (from the admin page). Chat channels open prefilled
// on the client, so this route is email-only. The send is logged to email_log, which is
// what the audience endpoint reads back to mark a recipient "contacted".
const schema = z.object({
  email: z.string().trim().email(),
  subject: z.string().trim().min(1).max(200),
  text: z.string().trim().min(1).max(15000),
});

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { email, subject, text } = schema.parse(await req.json());
    await sendReferralOutreachEmail(email, subject, text);
    return NextResponse.json({ ok: true, to: email });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Missing email, subject or message." }, { status: 400 });
    const msg = error instanceof Error ? error.message : "Could not send";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500 });
  }
}
