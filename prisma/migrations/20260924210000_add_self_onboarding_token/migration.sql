-- Per-session public token for the DIY self-onboarding flow (ambassador drives only their own session).
ALTER TABLE "self_service_onboardings" ADD COLUMN IF NOT EXISTS "public_token" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "self_service_onboardings_public_token_key" ON "self_service_onboardings"("public_token");
