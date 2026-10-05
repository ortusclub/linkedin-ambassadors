-- Twilio-style auto-recharge consent + settings on the user wallet
ALTER TABLE "users"
  ADD COLUMN "auto_recharge_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "auto_recharge_threshold" DECIMAL(10,2),
  ADD COLUMN "auto_recharge_amount" DECIMAL(10,2);

-- Record which voucher code (if any) was applied to a rental
ALTER TABLE "rentals"
  ADD COLUMN "discount_code" TEXT;

-- Admin-managed voucher / discount codes
CREATE TABLE "discount_codes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "value" DECIMAL(10,2) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "max_redemptions" INTEGER,
  "times_redeemed" INTEGER NOT NULL DEFAULT 0,
  "expires_at" TIMESTAMP(3),
  "note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "discount_codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "discount_codes_code_key" ON "discount_codes"("code");
