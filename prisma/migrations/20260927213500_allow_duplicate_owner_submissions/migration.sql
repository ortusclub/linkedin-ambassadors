-- Owners may submit duplicates with warnings. Each submission retains unique
-- application/account IDs and a unique private public_token; no old access is reused.
ALTER TABLE "self_service_onboardings" DROP CONSTRAINT IF EXISTS "self_service_onboardings_email_key";
DROP INDEX IF EXISTS "self_service_onboardings_email_key";
ALTER TABLE "self_service_onboardings" DROP CONSTRAINT IF EXISTS "self_service_onboardings_linkedin_url_key";
DROP INDEX IF EXISTS "self_service_onboardings_linkedin_url_key";
CREATE INDEX "self_service_onboardings_email_idx" ON "self_service_onboardings"("email");
CREATE INDEX "self_service_onboardings_linkedin_url_idx" ON "self_service_onboardings"("linkedin_url");
