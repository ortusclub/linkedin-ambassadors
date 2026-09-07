-- Per-owner payout currency override on the Account Owners page.
-- Null = inherit the referrer's currency (referral-currency.ts). A value ("PHP" |
-- "USD") pins the ambassador to that currency regardless of who referred them —
-- e.g. an Indian ambassador on the USD offer signed up by a PH referrer.
ALTER TABLE "ambassador_applications" ADD COLUMN "payout_currency" TEXT;
