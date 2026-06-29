-- Idea prioritisation (P1/P2/P3) for the content backlog
ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "priority" TEXT NOT NULL DEFAULT 'P2';
