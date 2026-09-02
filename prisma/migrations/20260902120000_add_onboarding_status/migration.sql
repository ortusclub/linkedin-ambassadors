-- Add an "onboarding" stage between accepted and onboarded: the warm-up window
-- (established 3-day / fresh 1-week) that runs BEFORE we log into the account.
-- "onboarded" now means we've logged in / the account is in hand.
ALTER TYPE "AmbassadorStatus" ADD VALUE IF NOT EXISTS 'onboarding';

-- When the onboarding (warm-up) process started. Drives the "log in due" nudge
-- (onboarding_started_at + 3/7 days). The setup fee is anchored on onboarded_at + 24h.
ALTER TABLE "ambassador_applications" ADD COLUMN IF NOT EXISTS "onboarding_started_at" TIMESTAMP(3);
