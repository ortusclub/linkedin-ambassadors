-- CreateEnum
CREATE TYPE "AmbassadorStatus" AS ENUM ('pending', 'reviewing', 'approved', 'rejected', 'onboarded');

-- AlterTable
ALTER TABLE "linkedin_accounts" ALTER COLUMN "status" SET DEFAULT 'available';

-- CreateTable
CREATE TABLE "ambassador_applications" (
    "id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "linkedin_url" TEXT NOT NULL,
    "connection_count" INTEGER,
    "industry" TEXT,
    "location" TEXT,
    "notes" TEXT,
    "status" "AmbassadorStatus" NOT NULL DEFAULT 'pending',
    "offered_amount" DECIMAL(10,2),
    "admin_notes" TEXT,
    "bank_name" TEXT,
    "bank_account_name" TEXT,
    "bank_account_number" TEXT,
    "bank_routing_number" TEXT,
    "bank_sort_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ambassador_applications_pkey" PRIMARY KEY ("id")
);
