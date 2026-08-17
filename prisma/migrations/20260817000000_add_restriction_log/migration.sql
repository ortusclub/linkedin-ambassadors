-- Append-only history of restriction/recovery events per account.
ALTER TABLE "linkedin_accounts" ADD COLUMN "restriction_log" JSONB;
