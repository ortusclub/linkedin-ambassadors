-- LV handler (PoC) for an inventory-only account with no ambassador application
-- (e.g. Ortus-owned accounts handled by Ton). Accounts WITH an application keep the
-- PoC on the application; this covers the account-only pipeline rows.
ALTER TABLE "linkedin_accounts" ADD COLUMN IF NOT EXISTS "poc" TEXT;
