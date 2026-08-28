-- Referrer email (some rows already backfilled directly) + payout "notified" timestamp.
-- IF NOT EXISTS keeps this idempotent: the referrers.email column was added out-of-band
-- when the referrer emails were first backfilled, so a plain ADD COLUMN would fail here.
ALTER TABLE "referrers" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "payouts" ADD COLUMN IF NOT EXISTS "notified_at" TIMESTAMP(3);
