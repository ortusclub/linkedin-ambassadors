import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { onboardingMailRequest } from "@/services/onboarding-mail";

// Emails the referral-program invite from the onboarded pipeline row. Chat channels
// (WhatsApp/Telegram/Viber) open directly from the client, so this route is email-only.
const schema = z.object({
  recipient: z.enum(["ambassador", "referrer"]),
  subject: z.string().trim().min(1).max(200),
  text: z.string().trim().min(1).max(15000),
  requestId: z.string().uuid(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAdmin();
    const input = schema.parse(await req.json());
    const { id } = await params;
    const app = await prisma.ambassadorApplication.findUnique({ where: { id }, select: { email: true, referredBy: true } });
    if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });

    let to = app.email;
    if (input.recipient === "referrer") {
      const ref = app.referredBy ? await prisma.referrer.findFirst({ where: { slug: { equals: app.referredBy, mode: "insensitive" } }, select: { email: true, contacts: true, contactMethod: true, contactHandle: true } }) : null;
      const contacts = (Array.isArray(ref?.contacts) ? ref.contacts : []) as Array<{ method?: string; handle?: string }>;
      to = ref?.email || contacts.find(c => c.method?.toLowerCase() === "email")?.handle || (ref?.contactMethod?.toLowerCase() === "email" ? ref.contactHandle : "") || "";
    }
    if (!z.string().email().safeParse(to).success) return NextResponse.json({ error: `No ${input.recipient} email is saved.` }, { status: 400 });

    await onboardingMailRequest("/emails", { from: process.env.RESEND_FROM_EMAIL || "LinkedVelocity <info@linkedvelocity.com>", reply_to: "info@linkedvelocity.com", to: [to], subject: input.subject, text: input.text }, `referral-invite-${id}-${input.requestId}`);

    const logId = `referral:${input.requestId}`;
    const entry = JSON.stringify([{ id: logId, ch: "email", text: `Referral invite to ${input.recipient} (${to}): ${input.subject}\n\n${input.text}`, by: user.fullName || user.email, at: new Date().toISOString() }]);
    await prisma.$executeRaw`UPDATE ambassador_applications SET outreach_log = COALESCE(outreach_log, '[]'::jsonb) || ${entry}::jsonb, updated_at = NOW() WHERE id = ${id}::uuid AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(outreach_log, '[]'::jsonb)) item WHERE item->>'id' = ${logId})`;

    return NextResponse.json({ ok: true, to });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send email";
    return NextResponse.json({ error: error instanceof z.ZodError ? "Complete the message before sending." : message }, { status: message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : error instanceof z.ZodError ? 400 : 500 });
  }
}
