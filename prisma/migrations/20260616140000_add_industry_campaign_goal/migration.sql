-- Align renter tracker with internal sheet: industry + campaign goal
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "industry" TEXT;
ALTER TABLE "rentals" ADD COLUMN IF NOT EXISTS "campaign_goal" TEXT;
