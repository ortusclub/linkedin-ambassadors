-- Track which renewal-cadence emails have fired this cycle
ALTER TABLE "rentals" ADD COLUMN IF NOT EXISTS "renewal_reminders_sent" JSONB NOT NULL DEFAULT '[]';
