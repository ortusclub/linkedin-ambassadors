import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendReferralOutreachEmail } from "@/services/email";

// Sends ONE referral-outreach email (from the admin page). Chat channels open prefilled
// on the client. The send is logged to email_log (for the "contacted" badge), and when an
// applicationId is given (segments 2/3 are ambassador apps) also to that application's
// outreach_log so it shows up in the pipeline activity feed.
const schema = z.object({
  email: z.string().trim().email(),
  subject: z.string().trim().min(1).max(200),
  text: z.string().trim().min(1).max(15000),
  applicationId: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  try {
    const user = await requireAdmin();
    const { email, subject, text, applicationId } = schema.parse(await req.json());
    // Never email someone on the do-not-contact list, even if the page is stale.
    if (await prisma.outreachSuppression.findUnique({ where: { email: email.toLowerCase() } })) {
      return NextResponse.json({ error: "This person is on the do-not-contact list." }, { status: 409 });
    }
    await sendReferralOutreachEmail(email, subject, text);
    if (applicationId) {
      const entry = JSON.stringify([{ id: `referral:${randomUUID()}`, ch: "email", text: `Referral program invite emailed (${email}): ${subject}`, by: user.fullName || user.email, at: new Date().toISOString() }]);
      await prisma.$executeRaw`UPDATE ambassador_applications SET outreach_log = COALESCE(outreach_log, '[]'::jsonb) || ${entry}::jsonb, updated_at = NOW() WHERE id = ${applicationId}::uuid`.catch(() => {});
    }
    return NextResponse.json({ ok: true, to: email });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Missing email, subject or message." }, { status: 400 });
    const msg = error instanceof Error ? error.message : "Could not send";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500 });
  }
}
