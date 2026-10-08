-- Self-serve replacement: a new rental can point back to the rental it replaced, and the
-- old rental's status becomes "replaced". Keeps account counts honest (the Dharmendra lesson).
-- Safe to run together on PG12+ because this migration never USES the new enum value.
ALTER TYPE "RentalStatus" ADD VALUE IF NOT EXISTS 'replaced';

ALTER TABLE "rentals" ADD COLUMN "replaces_rental_id" UUID;

ALTER TABLE "rentals" ADD CONSTRAINT "rentals_replaces_rental_id_fkey"
  FOREIGN KEY ("replaces_rental_id") REFERENCES "rentals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "rentals_replaces_rental_id_idx" ON "rentals"("replaces_rental_id");
