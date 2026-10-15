-- Captured LinkedIn account-security emails, one row per inbound email (deduped by email_id).
CREATE TABLE "account_mail_events" (
    "id" UUID NOT NULL,
    "email_id" TEXT NOT NULL,
    "linkedin_account_id" UUID NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL,
    "from_addr" TEXT NOT NULL,
    "to_addr" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body_text" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'logged',
    "location_label" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "account_mail_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "account_mail_events_email_id_key" ON "account_mail_events"("email_id");
CREATE INDEX "account_mail_events_linkedin_account_id_received_at_idx" ON "account_mail_events"("linkedin_account_id", "received_at");
CREATE INDEX "account_mail_events_linkedin_account_id_status_idx" ON "account_mail_events"("linkedin_account_id", "status");

ALTER TABLE "account_mail_events" ADD CONSTRAINT "account_mail_events_linkedin_account_id_fkey" FOREIGN KEY ("linkedin_account_id") REFERENCES "linkedin_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
