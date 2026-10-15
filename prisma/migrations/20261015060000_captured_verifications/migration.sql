-- CreateTable
CREATE TABLE "captured_verifications" (
    "id" UUID NOT NULL,
    "email_id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "from_addr" TEXT NOT NULL,
    "subject" TEXT,
    "confirm_url" TEXT,
    "code" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "captured_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "captured_verifications_email_id_key" ON "captured_verifications"("email_id");

-- CreateIndex
CREATE INDEX "captured_verifications_address_idx" ON "captured_verifications"("address");

-- CreateIndex
CREATE INDEX "captured_verifications_received_at_idx" ON "captured_verifications"("received_at");
