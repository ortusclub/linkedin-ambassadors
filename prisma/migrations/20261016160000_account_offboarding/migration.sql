-- End-of-rental lockdown checklist state per account.
ALTER TABLE "linkedin_accounts" ADD COLUMN "offboarding" JSONB;
