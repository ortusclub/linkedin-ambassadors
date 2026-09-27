CREATE TABLE "account_code_links" (
  "token_hash" TEXT NOT NULL,
  "account_id" UUID NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "account_code_links_pkey" PRIMARY KEY ("token_hash"),
  CONSTRAINT "account_code_links_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "linkedin_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "account_code_links_expires_at_idx" ON "account_code_links"("expires_at");
