-- Banked downtime-credit days on a rental, any cause (restriction recovery, swap, proxy/infra outage).
ALTER TABLE "rentals" ADD COLUMN "downtime_credit_days" INTEGER NOT NULL DEFAULT 0;
