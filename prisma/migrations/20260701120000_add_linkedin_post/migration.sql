-- Store a repurposed LinkedIn caption per blog post (optional) + when it was shared
ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "linkedin_post" TEXT;
ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "linkedin_posted_at" TIMESTAMP(3);
