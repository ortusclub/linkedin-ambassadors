-- Renter's "I'll wait" choice on a restricted account (shown in the renter dashboard and the
-- admin Replacements workqueue). Cleared when the account is recovered or replaced.
ALTER TABLE "rentals" ADD COLUMN "waiting_for_recovery" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "rentals" ADD COLUMN "wait_chosen_at" TIMESTAMP;
