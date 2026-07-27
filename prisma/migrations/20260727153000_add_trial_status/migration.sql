-- AlterEnum: add a "trial" account status (3-day inventory hold)
ALTER TYPE "AccountStatus" ADD VALUE 'trial' AFTER 'rented';

-- AlterTable: when a trial is active, trial_ends_at = start + 3 days
ALTER TABLE "linkedin_accounts" ADD COLUMN "trial_ends_at" TIMESTAMP(3);
