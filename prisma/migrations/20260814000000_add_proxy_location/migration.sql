-- Add proxy egress location to LinkedIn accounts
ALTER TABLE "linkedin_accounts" ADD COLUMN "proxy_location" TEXT;
