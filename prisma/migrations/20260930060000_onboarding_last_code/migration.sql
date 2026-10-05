-- Latest LinkedIn verification/OTP code parsed from a forwarded onboarding email.
-- Surfaced to the referrer (wizard) and team (admin) DURING onboarding only; written while
-- forwarding is active and cleared on confirm/onboard, so codes are never kept afterwards.
ALTER TABLE "onboarding_email_setups" ADD COLUMN IF NOT EXISTS "last_code" TEXT;
ALTER TABLE "onboarding_email_setups" ADD COLUMN IF NOT EXISTS "last_code_at" TIMESTAMP(3);
