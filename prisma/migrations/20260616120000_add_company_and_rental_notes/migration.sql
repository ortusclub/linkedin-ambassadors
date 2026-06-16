-- Renter tracker: company on users + admin notes on rentals
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "company" TEXT;
ALTER TABLE "rentals" ADD COLUMN IF NOT EXISTS "notes" TEXT;
