CREATE TABLE "scheduled_meetings" (
"id" UUID PRIMARY KEY, "application_id" UUID UNIQUE REFERENCES "ambassador_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE,
"name" TEXT NOT NULL, "email" TEXT NOT NULL, "contact" TEXT NOT NULL, "host" TEXT NOT NULL,
"starts_at" TIMESTAMP(3) NOT NULL, "invite_sent_at" TIMESTAMP(3), "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
UNIQUE ("host", "starts_at")
);
