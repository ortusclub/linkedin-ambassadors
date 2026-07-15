// Read-only helper to detect incoming USDT (TRC-20) payments on TRON, using the
// public TronGrid API — no exchange/Binance account needed, just public chain data.
//
// Used by the weekly-payment cron to auto-confirm off-platform rental payments:
// renters pay weekly USDT to a single shared receiving wallet, and we match an
// incoming transfer to a rental by its exact weekly amount. See
// src/app/api/cron/check-weekly-payments/route.ts.

// Tether USDT on TRON (the token contract — i.e. the currency, not a wallet).
export const TRON_USDT_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";

// The shared wallet all off-platform renters pay into. Overridable via env if it
// ever changes, so we don't need a redeploy to point at a new wallet.
export const RECEIVING_WALLET = process.env.TRON_RECEIVING_WALLET || "TM54XeBh1Fz9q4MgQW5zyA8NeKQejqapYa";

const TRONGRID_BASE = "https://api.trongrid.io";

export interface UsdtTransfer {
  amount: number;   // USDT (already divided by 1e6)
  from: string;     // sender TRON address
  ts: number;       // block timestamp (ms since epoch)
  txId: string;     // transaction hash
}

// Fetch incoming USDT transfers to `wallet`, newest first, optionally only those
// at/after `sinceTs` (ms). Returns [] on any API/network error (caller decides).
export async function fetchIncomingUsdt(
  wallet: string = RECEIVING_WALLET,
  opts: { sinceTs?: number; limit?: number } = {}
): Promise<UsdtTransfer[]> {
  const { sinceTs, limit = 50 } = opts;
  const params = new URLSearchParams({
    only_to: "true",
    limit: String(Math.min(limit, 200)),
    contract_address: TRON_USDT_CONTRACT,
  });
  if (sinceTs) params.set("min_timestamp", String(sinceTs));

  const url = `${TRONGRID_BASE}/v1/accounts/${wallet}/transactions/trc20?${params}`;
  const headers: Record<string, string> = {};
  // Optional key raises the rate limit; the public tier is fine for a daily check.
  if (process.env.TRONGRID_API_KEY) headers["TRON-PRO-API-KEY"] = process.env.TRONGRID_API_KEY;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    if (!res.ok) {
      console.error(`TronGrid ${res.status} for ${wallet}`);
      return [];
    }
    const json = (await res.json()) as { success?: boolean; data?: unknown[] };
    if (!json || json.success === false || !Array.isArray(json.data)) return [];

    const out: UsdtTransfer[] = [];
    for (const raw of json.data) {
      const t = raw as {
        value?: string; from?: string; to?: string; block_timestamp?: number;
        transaction_id?: string; token_info?: { decimals?: number };
      };
      // Guard: only USDT-contract transfers actually addressed to this wallet.
      if (!t.value || !t.transaction_id) continue;
      if (t.to && t.to.toLowerCase() !== wallet.toLowerCase()) continue;
      const decimals = t.token_info?.decimals ?? 6;
      out.push({
        amount: Number(t.value) / 10 ** decimals,
        from: t.from || "",
        ts: t.block_timestamp || 0,
        txId: t.transaction_id,
      });
    }
    return out;
  } catch (e) {
    console.error("fetchIncomingUsdt error:", e);
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
