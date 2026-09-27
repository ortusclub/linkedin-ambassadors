UPDATE "inbound_leads" SET "status" = 'Not Interested / Cancelled', "updated_at" = NOW()
WHERE LOWER(TRIM("status")) IN ('not interested', 'cancelled');
