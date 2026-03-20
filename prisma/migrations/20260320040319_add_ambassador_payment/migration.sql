-- AlterTable
ALTER TABLE "linkedin_accounts" ADD COLUMN     "ambassador_payment" DECIMAL(10,2) NOT NULL DEFAULT 0,
ALTER COLUMN "monthly_price" SET DEFAULT 0;
