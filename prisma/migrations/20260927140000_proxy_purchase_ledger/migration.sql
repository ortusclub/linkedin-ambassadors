CREATE TABLE proxy_purchase_attempts (
 account_id UUID PRIMARY KEY REFERENCES linkedin_accounts(id),
 state TEXT NOT NULL,
 amount NUMERIC(10,2) NOT NULL,
 country TEXT NOT NULL,
 order_id TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE self_service_onboardings DROP CONSTRAINT self_service_onboardings_proxy_slot_check;
ALTER TABLE self_service_onboardings ADD CONSTRAINT self_service_onboardings_proxy_slot_check
 CHECK (proxy_id IS NULL OR (proxy_slot IS NOT NULL AND proxy_slot IN (1,2,3,4)));
