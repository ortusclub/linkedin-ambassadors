ALTER TABLE "inbound_leads"
  ADD COLUMN "added_to_ambassador_pipeline" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "added_to_referral_pipeline" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "added_to_client_crm" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "inbound_leads" ADD COLUMN "ambassador_application_id" UUID, ADD COLUMN "referrer_id" UUID;
-- Preserve contacts that were already in CRM before explicit routing was introduced.
UPDATE "inbound_leads" SET "added_to_client_crm" = true WHERE "source" IS DISTINCT FROM 'Google Calendar booking';
