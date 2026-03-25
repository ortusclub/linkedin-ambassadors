-- AlterTable
ALTER TABLE "linkedin_accounts" ADD COLUMN "linkedin_account_health" TEXT DEFAULT 'unchecked';
ALTER TABLE "linkedin_accounts" ADD COLUMN "health_checked_at" TIMESTAMP(3);
