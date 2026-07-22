-- Account login credentials (admin-only; we hold the login for rented profiles)
ALTER TABLE "linkedin_accounts" ADD COLUMN "login_email" TEXT;
ALTER TABLE "linkedin_accounts" ADD COLUMN "account_password" TEXT;
ALTER TABLE "linkedin_accounts" ADD COLUMN "two_factor" TEXT;
ALTER TABLE "linkedin_accounts" ADD COLUMN "work_email" TEXT;

-- Owner payout: free-text handle (e.g. GCash number) + recurring monthly payout log
ALTER TABLE "ambassador_applications" ADD COLUMN "payment_details" TEXT;
ALTER TABLE "ambassador_applications" ADD COLUMN "monthly_payouts" JSONB;
