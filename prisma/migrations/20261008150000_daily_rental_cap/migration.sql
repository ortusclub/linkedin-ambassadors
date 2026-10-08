-- Per-renter daily rental cap (anti-burn speed limit). Admin-set in /admin/customers,
-- enforced at checkout. Shadow renters are exempt; replacements don't count. Default 5.
ALTER TABLE "users" ADD COLUMN "daily_rental_limit" INTEGER NOT NULL DEFAULT 5;
