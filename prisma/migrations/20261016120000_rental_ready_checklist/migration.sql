-- Per-account rental-ready housekeeping checklist (gate before listing Available).
ALTER TABLE "linkedin_accounts" ADD COLUMN "rental_ready_checklist" JSONB;
