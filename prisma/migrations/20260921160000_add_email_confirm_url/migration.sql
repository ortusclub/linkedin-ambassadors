-- Store LinkedIn's confirmation link so the wizard can show it (no reliance on forwarded email).
ALTER TABLE "onboarding_email_setups" ADD COLUMN "confirm_url" TEXT;
