CREATE TABLE "inbound_leads_archive" (LIKE "inbound_leads" INCLUDING DEFAULTS);
ALTER TABLE "inbound_leads_archive" ADD PRIMARY KEY ("id");
INSERT INTO "inbound_leads_archive" SELECT * FROM "inbound_leads";
CREATE TABLE "inbound_bookings_archive" AS SELECT "key", "lead_id", "scheduled_at", "cancelled" FROM "inbound_bookings";
