-- Tiered referral commission: record how a DIY onboarding was completed, and a
-- snapshot of the account's verified state at that time (commission is locked to it).
ALTER TABLE "ambassador_applications" ADD COLUMN "onboarding_method" TEXT;
ALTER TABLE "ambassador_applications" ADD COLUMN "onboarding_verified" BOOLEAN;
