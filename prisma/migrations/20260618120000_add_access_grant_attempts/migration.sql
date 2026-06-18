-- Auto-grant retry counter
ALTER TABLE "rentals" ADD COLUMN IF NOT EXISTS "access_grant_attempts" INTEGER NOT NULL DEFAULT 0;
