import { NextResponse } from "next/server";
import { sendTelegramMessageNotification } from "@/services/email";
import { prisma } from "@/lib/prisma";

interface TelegramFrom {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
}

interface TelegramChat {
  id: number;
  type: string;
}

interface TelegramMessage {
  message_id: number;
  from?: TelegramFrom;
  chat: TelegramChat;
  date: number;
  text?: string;
  caption?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  channel_post?: TelegramMessage;
}

// One entry in a lead's commsLog timeline (matches the admin Inbound tab shape).
type Comm = { ts: string; channel: string; body: string };

const CALENDAR_URL =
  "https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ1he_qAS5s8faJzrAIjTJi8KIX9xvPhGbC4Ipn38lPTLzkfSuoyMIiqUrB0viY2jpXr_W_zLSdq";

// Tappable menu shown under every reply so people always have a path forward.
const MENU = {
  inline_keyboard: [
    [{ text: "🔹 Rent LinkedIn accounts", url: "https://linkedvelocity.com/catalogue" }],
    [{ text: "💸 Earn by sharing your account", url: "https://linkedvelocity.com/become-ambassador" }],
    [{ text: "📅 Book a call", url: CALENDAR_URL }],
  ],
};

// Reply to the user via the Telegram Bot API. Needs TELEGRAM_BOT_TOKEN in env.
async function sendTelegramReply(chatId: number, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn("TELEGRAM_BOT_TOKEN not set — bot can receive but cannot reply.");
    return;
  }
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        reply_markup: MENU,
      }),
    });
  } catch (e) {
    console.error("Telegram sendMessage failed:", e);
  }
}

const WELCOME =
  "👋 <b>Welcome to LinkedVelocity!</b>\n\n" +
  "We help you either <b>rent LinkedIn accounts</b> for B2B outreach, or <b>earn by sharing</b> your own account.\n\n" +
  "A team member will personally reach out during business hours (<b>9am–6pm GMT+8</b>). " +
  "In the meantime, pick an option below 👇";

const ACK =
  "Thanks for your message! 🙌 A member of our team will get back to you personally during business hours " +
  "(<b>9am–6pm GMT+8</b>).\n\nWhile you wait, these might help 👇";

export async function POST(req: Request) {
  try {
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (secret) {
      const provided = req.headers.get("x-telegram-bot-api-secret-token");
      if (provided !== secret) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const update = (await req.json()) as TelegramUpdate;
    const message = update.message || update.edited_message || update.channel_post;

    if (!message || message.from?.is_bot) {
      return NextResponse.json({ ok: true });
    }

    const text = message.text || message.caption;
    if (!text) {
      return NextResponse.json({ ok: true });
    }

    const fromName = message.from
      ? [message.from.first_name, message.from.last_name].filter(Boolean).join(" ") ||
        message.from.username ||
        `User ${message.from.id}`
      : "Unknown sender";

    // Reply to the user so they're never left in silence, then notify the team.
    const isStart = text.trim().toLowerCase().startsWith("/start");
    await sendTelegramReply(message.chat.id, isStart ? WELCOME : ACK);

    // Log to the inbound-leads tracker — one row per person (channel+contact),
    // updated on repeat messages. Feeds the admin Inbound tab + Google Sheet.
    // Each message is appended to the commsLog timeline (newest first) so the
    // full thread is visible, not just the latest message.
    const contact = String(message.chat.id);
    const handle = message.from?.username ? `@${message.from.username}` : null;
    const body = text.slice(0, 1000);
    const entry: Comm = { ts: new Date().toISOString(), channel: "telegram", body };
    let recent: Comm[] = [entry];
    try {
      const existing = await prisma.inboundLead.findUnique({
        where: { channel_contact: { channel: "telegram", contact } },
        select: { commsLog: true },
      });
      const prior = Array.isArray(existing?.commsLog) ? (existing!.commsLog as Comm[]) : [];
      const log = [entry, ...prior].slice(0, 50); // newest first, cap stored history
      recent = log.slice(0, 3);
      await prisma.inboundLead.upsert({
        where: { channel_contact: { channel: "telegram", contact } },
        create: {
          channel: "telegram",
          name: fromName,
          handle,
          contact,
          message: body,
          commsLog: log,
          status: "New",
        },
        update: {
          name: fromName,
          handle,
          message: body,
          commsLog: log,
          lastContactAt: new Date(),
          messageCount: { increment: 1 },
        },
      });
    } catch (e) {
      console.error("inbound lead log failed:", e);
    }

    // Notify the team, including the last few messages for quick context.
    await sendTelegramMessageNotification({
      fromName,
      username: message.from?.username || null,
      chatId: message.chat.id,
      text,
      recent,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ ok: true });
  }
}
