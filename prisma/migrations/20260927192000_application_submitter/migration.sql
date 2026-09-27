ALTER TABLE "ambassador_applications" ADD COLUMN "submitted_by_user_id" UUID;
ALTER TABLE "ambassador_applications" ADD CONSTRAINT "ambassador_applications_submitted_by_user_id_fkey" FOREIGN KEY ("submitted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "ambassador_applications_submitted_by_user_id_idx" ON "ambassador_applications"("submitted_by_user_id");
