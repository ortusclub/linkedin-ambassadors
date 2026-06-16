-- LV point of contact on rental agreements
ALTER TABLE "rentals" ADD COLUMN IF NOT EXISTS "lv_poc" TEXT;
