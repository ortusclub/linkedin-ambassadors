-- Shadow renter (e.g. Apex Strategy): rents idle accounts at a flat rate without
-- removing them from the catalogue; a real customer rental yields the shadow rental.
ALTER TABLE "users" ADD COLUMN "is_shadow_renter" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "rentals" ADD COLUMN "is_shadow" BOOLEAN NOT NULL DEFAULT false;
