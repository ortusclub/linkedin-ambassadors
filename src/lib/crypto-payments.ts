// Daily off-platform rent checker: some renters pay a daily rate in crypto
// straight to a per-account wallet (e.g. USDT on BNB Chain). This module scans
// the chain for new incoming transfers, records them as CryptoPayment rows,
// works out whether the renter is paid up against the agreed daily rate, and
// nudges them on Telegram when they've fallen behind.
//
// Networks supported so far: "bsc" (USDT BEP-20) and "tron" (USDT TRC-20, via
// the existing tron-payments helper). Add a fetcher per network as needed.
import { prisma } from "@/lib/prisma";
import { fetchIncomingUsdt as fetchIncomingTronUsdt } from "@/lib/tron-payments";

// ── BSC (BNB Chain) ──────────────────────────────────────────────────────────
// Public JSON-RPC — dRPC allows eth_getLogs over ≤10k-block ranges on the free
// tier, which is plenty for a daily scan. Overridable without a redeploy.
const BSC_RPC = process.env.BSC_RPC_URL || "https://bsc.drpc.org";
// Tether USDT on BSC (the token contract — i.e. the currency, not a wallet).
const BSC_USDT_CONTRACT = "0x55d398326f99059ff775485246999027b3197955";
const TOPIC_TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

export interface IncomingTransfer {
  amount: number;   // token units (e.g. USDT)
  from: string;     // sender address
  ts: number;       // ms since epoch
  txHash: string;
}

async function bscRpc(method: string, params: unknown[]): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(BSC_RPC, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: controller.signal,
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error.message || "RPC error");
    return json.result;
  } finally {
    clearTimeout(timeout);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Fetch incoming BEP-20 USDT transfers to `wallet` since `sinceTs` (ms).
// Calibrates the block window from actual block timestamps (BSC block time has
// changed over the years), then scans in 10k chunks with retries.
export async function fetchIncomingBscUsdt(wallet: string, sinceTs: number): Promise<IncomingTransfer[]> {
  const latest = parseInt(String(await bscRpc("eth_blockNumber", [])), 16);
  const blockTs = async (n: number) => {
    const b = (await bscRpc("eth_getBlockByNumber", ["0x" + n.toString(16), false])) as { timestamp: string };
    return parseInt(b.timestamp, 16) * 1000;
  };
  const latestTs = await blockTs(latest);
  const probe = latest - 200_000;
  const probeTs = await blockTs(probe);
  const msPerBlock = (latestTs - probeTs) / 200_000;
  // Start a safety margin (~2h of blocks) before sinceTs so we never miss one on
  // the boundary; the unique txHash constraint makes overlap harmless.
  const blocksBack = Math.ceil((latestTs - sinceTs) / msPerBlock) + Math.ceil(7_200_000 / msPerBlock);
  const fromBlock = Math.max(latest - blocksBack, 0);

  const toTopic = "0x000000000000000000000000" + wallet.toLowerCase().slice(2);
  const logs: { data: string; topics: string[]; blockNumber: string; transactionHash: string }[] = [];
  for (let from = fromBlock; from <= latest; from += 10_000) {
    const to = Math.min(from + 9_999, latest);
    let ok = false;
    for (let attempt = 0; attempt < 5 && !ok; attempt++) {
      try {
        const res = (await bscRpc("eth_getLogs", [{
          fromBlock: "0x" + from.toString(16),
          toBlock: "0x" + to.toString(16),
          address: BSC_USDT_CONTRACT,
          topics: [TOPIC_TRANSFER, null, toTopic],
        }])) as typeof logs;
        logs.push(...res);
        ok = true;
      } catch {
        await sleep(400 * (attempt + 1));
      }
    }
    if (!ok) console.error(`crypto-payments: BSC chunk ${from}-${to} failed for ${wallet}`);
    await sleep(120);
  }

  const transfers: IncomingTransfer[] = [];
  for (const log of logs) {
    let ts = 0;
    try {
      const b = (await bscRpc("eth_getBlockByNumber", [log.blockNumber, false])) as { timestamp: string };
      ts = parseInt(b.timestamp, 16) * 1000;
    } catch { /* keep 0 — filtered below */ }
    if (ts < sinceTs) continue;
    transfers.push({
      amount: Number(BigInt(log.data)) / 1e18, // BEP-20 USDT has 18 decimals
      from: "0x" + log.topics[1].slice(26),
      ts,
      txHash: log.transactionHash,
    });
  }
  return transfers;
}

// ── Telegram nudge ───────────────────────────────────────────────────────────
// Preferred path: send from the admin's PERSONAL Telegram account (GramJS user
// session) — lands in the existing chat with the renter, no bot restrictions.
// Needs TELEGRAM_USER_SESSION + TELEGRAM_API_ID + TELEGRAM_API_HASH in env, and
// paymentTelegramChatId can then simply be the renter's @username.
// Fallback: the support bot (TELEGRAM_BOT_TOKEN) — but bots can only DM people
// who have messaged them first, so that path needs a captured numeric chat id.
// Why the last send failed — surfaced (secret-free) in the cron response so a
// broken env var or bundling issue is diagnosable without log access.
export let lastSendError: string | null = null;

async function sendViaUserAccount(recipient: string, text: string): Promise<boolean> {
  const session = (process.env.TELEGRAM_USER_SESSION || "").trim();
  const apiId = Number((process.env.TELEGRAM_API_ID || "").trim() || 0);
  const apiHash = (process.env.TELEGRAM_API_HASH || "").trim();
  if (!session || !apiId || !apiHash) {
    lastSendError = `user-session env missing: session=${session ? session.length + "ch" : "NOT SET"}, apiId=${apiId ? "set" : "NOT SET"}, apiHash=${apiHash ? "set" : "NOT SET"}`;
    return false;
  }
  try {
    // Lazy import — GramJS is heavy; only load it when actually sending.
    const { TelegramClient } = await import("telegram");
    const { StringSession } = await import("telegram/sessions/index.js");
    const client = new TelegramClient(new StringSession(session), apiId, apiHash, { connectionRetries: 3 });
    await client.connect();
    try {
      // Plain text (no HTML): this is a personal chat message, not bot markup.
      await client.sendMessage(recipient.replace(/^@/, ""), { message: text });
      lastSendError = null;
      return true;
    } finally {
      await client.disconnect();
    }
  } catch (e) {
    lastSendError = `user-session send failed: ${e instanceof Error ? e.message : String(e)}`;
    console.error("crypto-payments: user-account send failed:", e);
    return false;
  }
}

async function sendViaBot(chatId: string, text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
    });
    return res.ok;
  } catch (e) {
    console.error("crypto-payments: telegram nudge failed:", e);
    return false;
  }
}

async function sendTelegramNudge(recipient: string, text: string): Promise<boolean> {
  // @username → personal account; numeric chat id works for the bot fallback.
  if (await sendViaUserAccount(recipient, text)) return true;
  if (/^-?\d+$/.test(recipient)) return sendViaBot(recipient, text);
  return false;
}

// ── Daily check ──────────────────────────────────────────────────────────────
export interface WalletCheckResult {
  accountId: string;
  accountName: string;
  wallet: string;
  network: string;
  newPayments: { amount: number; txHash: string; paidAt: string }[];
  totalPaid: number;
  paidUntil: string | null;   // ISO — trackedFrom + totalPaid/dailyRate days
  overdue: boolean;
  nudgeSent: boolean;
  sendError?: string | null;
}

export async function checkCryptoPayments(): Promise<WalletCheckResult[]> {
  const accounts = await prisma.linkedInAccount.findMany({
    where: { paymentWallet: { not: null } },
    include: { cryptoPayments: { orderBy: { paidAt: "desc" } } },
  });

  const results: WalletCheckResult[] = [];
  for (const a of accounts) {
    const wallet = a.paymentWallet!;
    const network = a.paymentNetwork || "bsc";
    const token = a.paymentToken || "USDT";
    // Scan from the last recorded payment (dedup by txHash makes overlap safe),
    // else from trackedFrom, else the last 7 days.
    const lastPaidAt = a.cryptoPayments[0]?.paidAt?.getTime();
    const sinceTs = lastPaidAt || a.paymentTrackedFrom?.getTime() || Date.now() - 7 * 86400000;

    let transfers: IncomingTransfer[] = [];
    try {
      if (network === "bsc") {
        transfers = await fetchIncomingBscUsdt(wallet, sinceTs);
      } else if (network === "tron") {
        transfers = (await fetchIncomingTronUsdt(wallet, { sinceTs })).map((t) => ({
          amount: t.amount, from: t.from, ts: t.ts, txHash: t.txId,
        }));
      } else {
        console.error(`crypto-payments: unsupported network "${network}" on ${a.linkedinName}`);
      }
    } catch (e) {
      console.error(`crypto-payments: scan failed for ${a.linkedinName} (${wallet}):`, e);
    }

    // Record anything new — createMany + skipDuplicates keys off the unique txHash.
    const fresh = transfers.filter((t) => t.amount > 0);
    let inserted: typeof fresh = [];
    if (fresh.length) {
      const known = new Set(a.cryptoPayments.map((p) => p.txHash));
      inserted = fresh.filter((t) => !known.has(t.txHash));
      if (inserted.length) {
        await prisma.cryptoPayment.createMany({
          data: inserted.map((t) => ({
            linkedinAccountId: a.id,
            txHash: t.txHash,
            network,
            token,
            amount: t.amount,
            fromAddress: t.from,
            paidAt: new Date(t.ts),
          })),
          skipDuplicates: true,
        });
      }
    }

    // Paid-up maths: total received / daily rate, counted from trackedFrom.
    const totalPaid = a.cryptoPayments.reduce((s, p) => s + Number(p.amount), 0)
      + inserted.reduce((s, t) => s + t.amount, 0);
    const rate = Number(a.paymentDailyRate || 0);
    let paidUntil: Date | null = null;
    let overdue = false;
    if (rate > 0 && a.paymentTrackedFrom) {
      paidUntil = new Date(a.paymentTrackedFrom.getTime() + (totalPaid / rate) * 86400000);
      overdue = paidUntil.getTime() < Date.now();
    }

    // Overdue → nudge the renter on Telegram (once per cron run, i.e. daily).
    let nudgeSent = false;
    if (overdue && a.paymentTelegramChatId) {
      const behindDays = Math.ceil((Date.now() - paidUntil!.getTime()) / 86400000);
      // Plain text — sent as a personal chat message (bot fallback renders it fine too).
      nudgeSent = await sendTelegramNudge(
        a.paymentTelegramChatId,
        `👋 Hi! Quick reminder — the rental payment for ${a.linkedinName} has fallen behind.\n\n` +
        `Rate: $${rate.toFixed(2)}/day · paid up to ${paidUntil!.toISOString().slice(0, 10)} (~${behindDays} day${behindDays === 1 ? "" : "s"} behind).\n\n` +
        `Please send ${token} to:\n${wallet}\n(${network === "bsc" ? "BNB Chain / BEP-20" : network === "tron" ? "TRON / TRC-20" : network})\n\n` +
        `Payments are picked up automatically — thank you! 🙏`
      );
    }

    results.push({
      accountId: a.id,
      accountName: a.linkedinName,
      wallet,
      network,
      newPayments: inserted.map((t) => ({ amount: t.amount, txHash: t.txHash, paidAt: new Date(t.ts).toISOString() })),
      totalPaid: Math.round(totalPaid * 100) / 100,
      paidUntil: paidUntil ? paidUntil.toISOString() : null,
      overdue,
      nudgeSent,
      sendError: overdue && a.paymentTelegramChatId && !nudgeSent ? lastSendError : null,
    });
  }
  return results;
}
