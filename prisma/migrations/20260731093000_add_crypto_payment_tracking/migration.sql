-- Off-platform crypto rent tracking: per-account receiving wallet + daily rate,
-- and a ledger of on-chain payments detected by the daily cron.
ALTER TABLE "linkedin_accounts" ADD COLUMN "payment_wallet" TEXT;
ALTER TABLE "linkedin_accounts" ADD COLUMN "payment_network" TEXT;
ALTER TABLE "linkedin_accounts" ADD COLUMN "payment_token" TEXT;
ALTER TABLE "linkedin_accounts" ADD COLUMN "payment_daily_rate" DECIMAL(10,2);
ALTER TABLE "linkedin_accounts" ADD COLUMN "payment_tracked_from" TIMESTAMP(3);
ALTER TABLE "linkedin_accounts" ADD COLUMN "payment_telegram_chat_id" TEXT;

CREATE TABLE "crypto_payments" (
    "id" UUID NOT NULL,
    "linkedin_account_id" UUID NOT NULL,
    "tx_hash" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "amount" DECIMAL(18,6) NOT NULL,
    "from_address" TEXT NOT NULL,
    "paid_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crypto_payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "crypto_payments_tx_hash_key" ON "crypto_payments"("tx_hash");
CREATE INDEX "crypto_payments_linkedin_account_id_paid_at_idx" ON "crypto_payments"("linkedin_account_id", "paid_at");

ALTER TABLE "crypto_payments" ADD CONSTRAINT "crypto_payments_linkedin_account_id_fkey" FOREIGN KEY ("linkedin_account_id") REFERENCES "linkedin_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
