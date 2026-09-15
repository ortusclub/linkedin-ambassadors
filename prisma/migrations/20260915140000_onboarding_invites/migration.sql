-- Per-owner onboarding invites: unique link + fill/status tracking for the referrer.
CREATE TABLE "onboarding_invites" (
    "id" UUID NOT NULL,
    "referrer_id" UUID NOT NULL,
    "owner_name" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "session_id" UUID,
    "filled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "onboarding_invites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "onboarding_invites_token_key" ON "onboarding_invites"("token");
CREATE UNIQUE INDEX "onboarding_invites_session_id_key" ON "onboarding_invites"("session_id");
CREATE INDEX "onboarding_invites_referrer_id_idx" ON "onboarding_invites"("referrer_id");

ALTER TABLE "onboarding_invites" ADD CONSTRAINT "onboarding_invites_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "referrers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
