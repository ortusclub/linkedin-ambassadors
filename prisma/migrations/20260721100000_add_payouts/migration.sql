-- CreateTable
CREATE TABLE "payouts" (
    "id" UUID NOT NULL,
    "referrer_id" UUID NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'day_rate',
    "description" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "method" TEXT,
    "reference" TEXT,
    "paid_at" TIMESTAMP(3),
    "paid_by" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "confirmed_by" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payouts_referrer_id_idx" ON "payouts"("referrer_id");

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "referrers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
