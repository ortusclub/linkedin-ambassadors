import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Records a chat outreach (WhatsApp/Telegram/Viber) against an ambassador application's
// outreach_log, so opening the chat from the outreach page shows in the pipeline activity.
// Email sends log themselves in /send; this is for the client-opened chat channels.
const schema = z.object({
  applicationId: z.string().uuid(),
  channel: z.enum(["whatsapp", "telegram", "viber"]),
});

export async function POST(req: Request) {
  try {
    const user = await requireAdmin();
    const { applicationId, channel } = schema.parse(await req.json());
    const entry = JSON.stringify([{ id: `referral:${randomUUID()}`, ch: channel, text: `Referral program invite sent via ${channel}`, by: user.fullName || user.email, at: new Date().toISOString() }]);
    await prisma.$executeRaw`UPDATE ambassador_applications SET outreach_log = COALESCE(outreach_log, '[]'::jsonb) || ${entry}::jsonb, updated_at = NOW() WHERE id = ${applicationId}::uuid`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Bad request" }, { status: 400 });
    const msg = error instanceof Error ? error.message : "Could not log";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500 });
  }
}
