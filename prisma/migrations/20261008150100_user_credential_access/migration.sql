-- Tiered credential access: when ON, this renter sees account login email, password and a
-- live 2FA code on their dashboard (for all accounts they rent), not just the GoLogin share.
-- Default OFF = GoLogin-only, as before. Admin-toggled per renter in /admin/customers.
ALTER TABLE "users" ADD COLUMN "credential_access" BOOLEAN NOT NULL DEFAULT false;
