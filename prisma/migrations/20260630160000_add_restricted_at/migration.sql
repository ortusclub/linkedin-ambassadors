-- Admin-controlled "restricted, recovering" state for a rented account
ALTER TABLE "linkedin_accounts" ADD COLUMN IF NOT EXISTS "restricted_at" TIMESTAMP(3);
