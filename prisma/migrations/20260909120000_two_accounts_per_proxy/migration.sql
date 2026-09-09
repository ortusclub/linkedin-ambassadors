ALTER TABLE "self_service_onboardings" ADD COLUMN "proxy_slot" INTEGER;
UPDATE "self_service_onboardings" SET "proxy_slot" = 1 WHERE "proxy_id" IS NOT NULL;
ALTER TABLE "self_service_onboardings" DROP CONSTRAINT "self_service_onboardings_proxy_id_key";
ALTER TABLE "self_service_onboardings" ADD CONSTRAINT "self_service_onboardings_proxy_slot_check"
  CHECK ("proxy_id" IS NULL OR ("proxy_slot" IS NOT NULL AND "proxy_slot" IN (1, 2)));
CREATE UNIQUE INDEX "self_service_onboardings_proxy_id_proxy_slot_key"
  ON "self_service_onboardings" ("proxy_id", "proxy_slot");
