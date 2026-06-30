-- Admin personal review of renter vetting
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "vetting_review" TEXT;
