-- CRM: pipeline stage + relationship owner + timestamped comms timeline (JSON) on leads
ALTER TABLE "inbound_leads" ADD COLUMN IF NOT EXISTS "stage" TEXT NOT NULL DEFAULT 'new';
ALTER TABLE "inbound_leads" ADD COLUMN IF NOT EXISTS "owner_email" TEXT;
ALTER TABLE "inbound_leads" ADD COLUMN IF NOT EXISTS "comms_log" JSONB;
