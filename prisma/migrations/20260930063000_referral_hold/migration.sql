-- Manual hold on a referrer's commission for a signup: moves it out of "due now" into a
-- Held section (with a reason) until released, without un-earning it. For blockers like a
-- restricted referred account or a referrer with no payout method saved.
ALTER TABLE "ambassador_applications" ADD COLUMN IF NOT EXISTS "referral_hold_reason" TEXT;
ALTER TABLE "ambassador_applications" ADD COLUMN IF NOT EXISTS "referral_held_at" TIMESTAMP(3);
