import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    if (typeof body.id !== "string" || typeof body.text !== "string" || !body.text.trim() || body.text.length > 4096) {
      return NextResponse.json({ error: "Enter a message of up to 4,096 characters." }, { status: 400 });
    }
    const lead = await prisma.inboundLead.findUnique({ where: { id: body.id }, select: { id: true, channel: true, contact: true } });
    if (!lead || lead.channel.toLowerCase() !== "telegram" || !/^[1-9]\d*$/.test(lead.contact || "")) {
      return NextResponse.json({ error: "This lead has no saved private Telegram bot chat. Use their Telegram username instead." }, { status: 400 });
    }
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return NextResponse.json({ error: "Telegram replies are not configured." }, { status: 503 });
    let response;
    try {
      response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: lead.contact, text: body.text.trim(), disable_web_page_preview: true }),
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      return NextResponse.json({ error: "Telegram did not confirm delivery. Check the conversation before retrying to avoid a duplicate." }, { status: 502 });
    }
    const result = await response.json();
    if (!response.ok || !result.ok) return NextResponse.json({ error: result.error_code === 403 ? "This person has blocked the bot or the bot cannot contact them." : "Telegram could not send the message. Please try again later." }, { status: 502 });
    // Append in SQL so incoming webhook messages are not overwritten by this reply.
    try {
      const entry = JSON.stringify([{ ts: new Date().toISOString(), channel: "telegram", direction: "outbound", body: body.text.trim() }]);
      await prisma.$executeRaw`UPDATE inbound_leads SET comms_log = ${entry}::jsonb || COALESCE(comms_log, '[]'::jsonb), replied = true, last_contact_at = NOW(), updated_at = NOW() WHERE id = ${lead.id}::uuid`;
    } catch {
      return NextResponse.json({ ok: true, warning: "Message sent, but the conversation log could not be updated. Do not resend." });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Unauthorized" || message === "Forbidden") return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 403 });
    return NextResponse.json({ error: "Could not prepare the Telegram reply." }, { status: 500 });
  }
}
