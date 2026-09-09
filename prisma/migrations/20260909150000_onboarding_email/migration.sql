CREATE TABLE "onboarding_email_setups" (
  "session_id" UUID PRIMARY KEY REFERENCES "self_service_onboardings"("id"),
  "address" TEXT NOT NULL UNIQUE,
  "destination" TEXT NOT NULL,
  "consent_at" TIMESTAMP(3) NOT NULL,
  "code_hash" TEXT,
  "code_expires_at" TIMESTAMP(3),
  "code_attempts" INTEGER NOT NULL DEFAULT 0,
  "code_sends" INTEGER NOT NULL DEFAULT 0,
  "code_sent_at" TIMESTAMP(3),
  "destination_verified_at" TIMESTAMP(3),
  "forwarding_until" TIMESTAMP(3),
  "primary_confirmed_at" TIMESTAMP(3),
  "last_forwarded_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "onboarding_email_deliveries" (
  "email_id" TEXT PRIMARY KEY,
  "session_id" UUID NOT NULL REFERENCES "onboarding_email_setups"("session_id"),
  "status" TEXT NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lease_until" TIMESTAMP(3),
  "sent_at" TIMESTAMP(3)
);
CREATE INDEX "onboarding_email_deliveries_session_id_idx" ON "onboarding_email_deliveries"("session_id");
