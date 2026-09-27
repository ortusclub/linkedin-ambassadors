ALTER TABLE "self_service_onboardings"
ADD COLUMN "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "reminder_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "reminder_sent_at" TIMESTAMP(3),
ADD COLUMN "reminder_claimed_at" TIMESTAMP(3);
CREATE INDEX "self_service_onboardings_reminder_due_idx" ON "self_service_onboardings" ("last_activity_at") WHERE "reminder_count" < 4 AND "public_token" IS NOT NULL;
