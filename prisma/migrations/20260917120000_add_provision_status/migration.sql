-- Auto-provisioning flag for pipeline accounts (GoLogin profile + proxy automation).
ALTER TABLE "linkedin_accounts" ADD COLUMN "provision_status" TEXT;
ALTER TABLE "linkedin_accounts" ADD COLUMN "provision_checked_at" TIMESTAMP(3);
