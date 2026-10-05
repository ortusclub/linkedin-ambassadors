-- Admin-set payout hold on an account: inaccessible / paused (NOT a LinkedIn restriction).
-- While set, the owner's monthly payout is held out of the Payouts II "due" chase until cleared.
ALTER TABLE "linkedin_accounts" ADD COLUMN IF NOT EXISTS "payout_hold_reason" TEXT;
ALTER TABLE "linkedin_accounts" ADD COLUMN IF NOT EXISTS "payout_held_at" TIMESTAMP(3);
