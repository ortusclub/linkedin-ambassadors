-- Phase 3: triage/incident fields on captured account-security emails.
ALTER TABLE "account_mail_events"
    ADD COLUMN "actioned_by" TEXT,
    ADD COLUMN "actioned_at" TIMESTAMP(3),
    ADD COLUMN "incident_opened_at" TIMESTAMP(3),
    ADD COLUMN "resolution" TEXT;
