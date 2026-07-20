-- Ambassador outreach logging: point-of-contact, the outreach touch log, and next follow-up date.
ALTER TABLE "ambassador_applications" ADD COLUMN "poc" TEXT;
ALTER TABLE "ambassador_applications" ADD COLUMN "outreach_log" JSONB;
ALTER TABLE "ambassador_applications" ADD COLUMN "next_follow_up" TIMESTAMP(3);
