-- Per-rental price lock (grandfather renters at their original rate)
ALTER TABLE "rentals" ADD COLUMN IF NOT EXISTS "locked_price" DECIMAL(10,2);
