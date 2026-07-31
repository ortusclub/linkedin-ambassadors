-- WhatsApp reminders (sent by the Mac-side agent) + nudge dedup across channels.
ALTER TABLE "linkedin_accounts" ADD COLUMN "payment_whatsapp" TEXT;
ALTER TABLE "linkedin_accounts" ADD COLUMN "last_nudge_at" TIMESTAMP(3);
