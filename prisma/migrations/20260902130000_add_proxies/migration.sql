-- Per-proxy metadata lookup, keyed by host:port. Holds only the fields that can't be
-- derived from a linked account: friendly label, provider, residential/datacenter type,
-- a country override, and a manual status flag.
CREATE TABLE "proxies" (
    "id" UUID NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "label" TEXT,
    "provider" TEXT,
    "type" TEXT,
    "country" TEXT,
    "status" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proxies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "proxies_host_port_key" ON "proxies"("host", "port");
