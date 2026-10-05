-- Tiered ("price book") discount codes: per-account price by verified flag + connections
ALTER TABLE "discount_codes" ADD COLUMN "tiers" JSONB;
