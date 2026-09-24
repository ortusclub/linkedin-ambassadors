-- Ortus inventory partition: segregates accounts brought in by Ortus referrers.
ALTER TABLE "linkedin_accounts" ADD COLUMN IF NOT EXISTS "inventory_pool" TEXT NOT NULL DEFAULT 'main';
