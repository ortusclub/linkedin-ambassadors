-- AlterTable: support pausing a rental and tracking its GoLogin shares for revoke
ALTER TABLE "rentals" ADD COLUMN IF NOT EXISTS "paused" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "rentals" ADD COLUMN IF NOT EXISTS "gologin_share_ids" JSONB NOT NULL DEFAULT '[]';
