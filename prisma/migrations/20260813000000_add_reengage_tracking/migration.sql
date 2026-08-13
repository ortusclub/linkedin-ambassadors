-- Dormant-signup re-engagement: track which nudge emails a user has been sent.
ALTER TABLE "users" ADD COLUMN "reengage_nudge_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "reengage_followup_at" TIMESTAMP(3);
