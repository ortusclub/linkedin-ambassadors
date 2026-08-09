-- Lets one account's rent status mirror another's, for a renter paying two
-- accounts with a single combined payment (no wallet-splitting attempted).
ALTER TABLE "linkedin_accounts" ADD COLUMN IF NOT EXISTS "payment_linked_account_id" UUID;
