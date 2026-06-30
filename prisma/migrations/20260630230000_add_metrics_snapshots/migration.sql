-- Daily snapshot of headline run-rate metrics (for dashboard month filter + trends)
CREATE TABLE IF NOT EXISTS "metrics_snapshots" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "mrr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "net_profit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "payouts" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "active_rentals" INTEGER NOT NULL DEFAULT 0,
    "total_customers" INTEGER NOT NULL DEFAULT 0,
    "total_accounts" INTEGER NOT NULL DEFAULT 0,
    "available_accounts" INTEGER NOT NULL DEFAULT 0,
    "rented_accounts" INTEGER NOT NULL DEFAULT 0,
    "offline_accounts" INTEGER NOT NULL DEFAULT 0,
    "restricted_accounts" INTEGER NOT NULL DEFAULT 0,
    "utilization" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metrics_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "metrics_snapshots_date_key" ON "metrics_snapshots"("date");
