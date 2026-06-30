-- Renter vetting (soft): info + agreement timestamp on the user
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "vetted_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "vetting_info" JSONB;
