CREATE TABLE primary_email_recoveries (
  id TEXT PRIMARY KEY,
  account_id UUID REFERENCES linkedin_accounts(id) ON DELETE CASCADE ON UPDATE CASCADE,
  address TEXT,
  destination TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP(3) NOT NULL,
  verified_at TIMESTAMP(3),
  forwarding_until TIMESTAMP(3),
  completed_at TIMESTAMP(3),
  last_forwarded_at TIMESTAMP(3)
);
CREATE INDEX primary_email_recoveries_destination_created_at_idx ON primary_email_recoveries(destination, created_at);
CREATE INDEX primary_email_recoveries_ip_hash_created_at_idx ON primary_email_recoveries(ip_hash, created_at);
CREATE INDEX primary_email_recoveries_address_forwarding_until_idx ON primary_email_recoveries(address, forwarding_until);
CREATE TABLE primary_email_deliveries (
  email_id TEXT PRIMARY KEY,
  recovery_id TEXT NOT NULL REFERENCES primary_email_recoveries(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  lease_until TIMESTAMP(3),
  sent_at TIMESTAMP(3)
);
CREATE INDEX primary_email_deliveries_recovery_id_idx ON primary_email_deliveries(recovery_id);
