-- Permanent LinkedIn restriction: the account can't be recovered. Set from the Replacements
-- workqueue; renters see "Permanently restricted" and can only replace it.
ALTER TABLE "linkedin_accounts" ADD COLUMN "permanently_restricted" BOOLEAN NOT NULL DEFAULT false;
