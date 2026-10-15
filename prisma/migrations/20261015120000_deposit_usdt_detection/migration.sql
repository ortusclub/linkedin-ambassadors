-- Add a per-address "last credited" tracker for USDT, so the deposit detector can
-- credit USDT top-ups on Base the same way it already does for USDC. USDC and USDT
-- are separate on-chain balances at the same address, so each needs its own baseline.
ALTER TABLE "deposit_addresses"
  ADD COLUMN "last_seen_usdt_balance" DECIMAL(18,6) NOT NULL DEFAULT 0;

-- One-time reconciliation: Alan Raymond (Proof of Codes, deposit #123) sent 50 USDT on
-- Base on 2026-10-13. It never auto-credited (detector only watched USDC) and was
-- credited to his wallet MANUALLY on 2026-10-14. That 50 USDT is still sitting at his
-- deposit address, so seed its USDT baseline to the credited amount — otherwise the new
-- detector would see it as a fresh deposit and credit it a second time on first run.
UPDATE "deposit_addresses"
  SET "last_seen_usdt_balance" = 50
  WHERE "address" = '0xFB3B6Eb8374DfaaE4420150f40f5E712730C5220';
