-- Manual call outcome (e.g. no-show) that overrides the calendar-derived stage.
ALTER TABLE "ambassador_applications" ADD COLUMN "call_outcome" TEXT;
