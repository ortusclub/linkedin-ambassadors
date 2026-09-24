-- Referrer's self-report about a LinkedIn restriction (QR check done / says it recovered),
-- sent from their portal so the team knows to verify. Does NOT auto-clear our record.
ALTER TABLE "ambassador_applications" ADD COLUMN "restriction_report" JSONB;
