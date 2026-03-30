-- AlterEnum
ALTER TYPE "AccountStatus" ADD VALUE 'removed';

-- AlterTable
ALTER TABLE "linkedin_accounts" ADD COLUMN "removed_at" TIMESTAMP(3),
ADD COLUMN "removed_by" TEXT;
