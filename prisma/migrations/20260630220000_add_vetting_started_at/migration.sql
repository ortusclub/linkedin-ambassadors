-- Track when a renter opens the vetting form (drop-off funnel)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "vetting_started_at" TIMESTAMP(3);
