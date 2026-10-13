-- Renter self-serve "fix my proxy" audit trail (one row per report).
CREATE TABLE "proxy_swaps" (
    "id" UUID NOT NULL,
    "rental_id" UUID NOT NULL,
    "linkedin_account_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "ticket_ref" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'fixing',
    "old_proxy_host" TEXT,
    "old_proxy_port" INTEGER,
    "new_proxy_host" TEXT,
    "new_proxy_port" INTEGER,
    "escalation_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    CONSTRAINT "proxy_swaps_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "proxy_swaps_ticket_ref_key" ON "proxy_swaps"("ticket_ref");
CREATE INDEX "proxy_swaps_user_id_status_idx" ON "proxy_swaps"("user_id", "status");
CREATE INDEX "proxy_swaps_rental_id_created_at_idx" ON "proxy_swaps"("rental_id", "created_at");
