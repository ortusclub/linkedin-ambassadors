-- Manual-tracked off-platform rentals: admin-set paid-through date (past it = overdue).
ALTER TABLE "linkedin_accounts" ADD COLUMN "manual_paid_until" TIMESTAMP(3);
