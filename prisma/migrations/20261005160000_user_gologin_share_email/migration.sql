-- Per-renter GoLogin share email: where profile shares are sent (defaults to account email).
-- Lets renters who access GoLogin under a different login (e.g. ProfilePartner's
-- support@profilepartner.net) receive shares there instead of their billing email.
ALTER TABLE "users" ADD COLUMN "gologin_share_email" TEXT;
