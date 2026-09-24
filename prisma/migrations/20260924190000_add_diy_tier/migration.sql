-- DIY landing page tier (standard/partial/full) the owner chose, driving their sign-on bonus.
ALTER TABLE "ambassador_applications" ADD COLUMN IF NOT EXISTS "diy_tier" TEXT;
