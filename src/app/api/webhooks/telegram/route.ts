import { NextResponse } from "next/server";
import { sendTelegramMessageNotification } from "@/services/email";

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

    await sendTelegramMessageNotification({
      fromName,
      username: message.from?.username || null,
      chatId: message.chat.id,
      text,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ ok: true });
  }
}
