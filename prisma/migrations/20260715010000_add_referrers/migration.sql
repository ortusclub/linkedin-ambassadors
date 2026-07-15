-- CreateTable
CREATE TABLE "referrers" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'marketer',
    "channel" TEXT,
    "contact_method" TEXT,
    "contact_handle" TEXT,
    "payment_method" TEXT,
    "payment_details" TEXT,
    "assigned_day" TEXT,
    "assigned_location" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referrers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "referrers_slug_key" ON "referrers"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "referrers_token_key" ON "referrers"("token");
