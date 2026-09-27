import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAdmin();
    const body = await req.json();
    if (typeof body.id !== "string" || typeof body.requestId !== "string" || !/^[a-z0-9-]{36}$/i.test(body.requestId) || typeof body.text !== "string" || !body.text.trim() || body.text.length > 10000) {
      return NextResponse.json({ error: "Enter a note of up to 10,000 characters." }, { status: 400 });
    }
    const channel = body.channel === undefined ? "note" : body.channel;
    if (!["note", "email", "linkedin", "telegram", "whatsapp", "viber", "call", "meeting"].includes(channel)) return NextResponse.json({ error: "Choose a valid entry type." }, { status: 400 });
    const authorName = user.email.toLowerCase() === "ardi@linkedvelocity.com" ? "Ardi" : user.fullName || user.email;
    const entry = JSON.stringify([{ id: body.requestId, ts: new Date().toISOString(), channel, body: body.text.trim(), authorName, authorEmail: user.email }]);
    await prisma.$executeRaw`UPDATE inbound_leads SET comms_log = ${entry}::jsonb || COALESCE(comms_log, '[]'::jsonb), updated_at = NOW(), last_contact_at = CASE WHEN ${channel} = 'note' THEN last_contact_at ELSE NOW() END WHERE id = ${body.id}::uuid AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(comms_log, '[]'::jsonb)) item WHERE item->>'id' = ${body.requestId})`;
    const lead = await prisma.inboundLead.findUnique({ where: { id: body.id } });
    if (!lead) return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    return NextResponse.json({ lead });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Unauthorized" || message === "Forbidden") return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 403 });
    return NextResponse.json({ error: "Could not save the note. Your draft has been kept." }, { status: 500 });
  }
}
