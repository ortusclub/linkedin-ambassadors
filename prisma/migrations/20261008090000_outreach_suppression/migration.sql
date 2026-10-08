-- Do-not-contact list for referral outreach, keyed by email.
CREATE TABLE IF NOT EXISTS "outreach_suppression" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "reason" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "outreach_suppression_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "outreach_suppression_email_key" ON "outreach_suppression"("email");
