-- The ambassador's own original email on the account, shown separately from the
-- klabber login email so the two are never confused (idempotent for safety).
ALTER TABLE "linkedin_accounts" ADD COLUMN IF NOT EXISTS "personal_email" TEXT;
