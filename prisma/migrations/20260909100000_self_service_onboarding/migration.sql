CREATE TABLE "self_service_onboardings" (
  "id" UUID PRIMARY KEY,
  "referrer_id" UUID NOT NULL REFERENCES "referrers"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "application_id" UUID NOT NULL UNIQUE REFERENCES "ambassador_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "account_id" UUID NOT NULL UNIQUE REFERENCES "linkedin_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "proxy_id" UUID UNIQUE REFERENCES "proxies"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "proxy_order_id" TEXT UNIQUE,
  "proxy_budget_reserved" DECIMAL(10,2),
  "proxy_purchase_at" TIMESTAMP(3),
  "email" TEXT NOT NULL UNIQUE,
  "linkedin_url" TEXT NOT NULL UNIQUE,
  "state" TEXT NOT NULL DEFAULT 'reserved',
  "consent_at" TIMESTAMP(3) NOT NULL,
  "opened_at" TIMESTAMP(3),
  "confirmed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "self_service_onboardings_referrer_id_idx" ON "self_service_onboardings"("referrer_id");
