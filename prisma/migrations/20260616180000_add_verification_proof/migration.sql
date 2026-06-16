-- Internal verification proof on inventory accounts
ALTER TABLE "linkedin_accounts" ADD COLUMN IF NOT EXISTS "verification_proof" TEXT;
