-- Alternate email used to book the onboarding call (for calendar matching when it differs from the application email).
ALTER TABLE "ambassador_applications" ADD COLUMN "booking_email" TEXT;
