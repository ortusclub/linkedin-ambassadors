-- Flags an account whose 2FA was exposed to a departed renter; blocks it from
-- going back to "available" until an admin rotates the code and clears this.
ALTER TABLE "linkedin_accounts" ADD COLUMN IF NOT EXISTS "two_factor_reset_needed" BOOLEAN NOT NULL DEFAULT false;
