-- Onboarding + payout tracking for ambassador applications.
ALTER TABLE "ambassador_applications" ADD COLUMN "onboarded_at" TIMESTAMP(3);
ALTER TABLE "ambassador_applications" ADD COLUMN "account_freshness" TEXT;
ALTER TABLE "ambassador_applications" ADD COLUMN "paid_at" TIMESTAMP(3);
ALTER TABLE "ambassador_applications" ADD COLUMN "marketer_paid_at" TIMESTAMP(3);
