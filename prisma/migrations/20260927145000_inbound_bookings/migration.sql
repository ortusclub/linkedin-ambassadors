CREATE TABLE "inbound_bookings" (
  "key" TEXT PRIMARY KEY,
  "lead_id" UUID NOT NULL REFERENCES "inbound_leads"("id") ON DELETE CASCADE,
  "event_id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "scheduled_at" TIMESTAMP(3) NOT NULL,
  "cancelled" BOOLEAN NOT NULL DEFAULT false,
  "fingerprint" TEXT NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "inbound_bookings_lead_id_idx" ON "inbound_bookings"("lead_id");
