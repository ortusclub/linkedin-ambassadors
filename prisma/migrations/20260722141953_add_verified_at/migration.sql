-- Stability-check "good to go" timestamp: payout unlocks only after the account is verified healthy (post-hold).
ALTER TABLE "ambassador_applications" ADD COLUMN "verified_at" TIMESTAMP(3);
