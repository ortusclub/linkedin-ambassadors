-- Warming-up flag: timestamp set while the account is being warmed up (Ortus app), null = not warming.
ALTER TABLE "linkedin_accounts" ADD COLUMN "warmup_started_at" TIMESTAMP(3);
