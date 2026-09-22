-- Post-sign-in fixes the referrer must do (email not primary / 2FA not set), surfaced on their portal.
ALTER TABLE "ambassador_applications" ADD COLUMN "onboarding_fix" JSONB;
