-- Short-term account hold / reservation (hidden from catalogues while heldUntil is in the future).
ALTER TABLE "linkedin_accounts"
    ADD COLUMN "held_until" TIMESTAMP(3),
    ADD COLUMN "held_for" TEXT,
    ADD COLUMN "held_by" TEXT,
    ADD COLUMN "held_at" TIMESTAMP(3);
