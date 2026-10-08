-- Link an ambassador account owner to their Referrer row when they are the same person
-- (both a referrer and an account owner). Shares contact + payout info; distinct from
-- referred_by (which is the slug of whoever referred the signup). Nullable; FK clears to
-- NULL if the referrer row is deleted.
ALTER TABLE "ambassador_applications" ADD COLUMN IF NOT EXISTS "referrer_id" UUID;

CREATE INDEX IF NOT EXISTS "ambassador_applications_referrer_id_idx" ON "ambassador_applications"("referrer_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ambassador_applications_referrer_id_fkey'
  ) THEN
    ALTER TABLE "ambassador_applications"
      ADD CONSTRAINT "ambassador_applications_referrer_id_fkey"
      FOREIGN KEY ("referrer_id") REFERENCES "referrers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
