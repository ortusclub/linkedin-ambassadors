const RPCS = ["https://bsc-rpc.publicnode.com", "https://bsc.drpc.org", "https://1rpc.io/bnb", "https://bsc-dataseed1.bnbchain.org"];
const USDT = "0x55d398326f99059ff775485246999027b3197955";
const ADDR = "0x55951c1a7d61402c6731bc029959a173b741031d";
const T = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const toTopic = "0x000000000000000000000000" + ADDR.slice(2);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function rpc(url, method, params) {
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message || "err");
  return j.result;
}

const latest = parseInt(await rpc(RPCS[0], "eth_blockNumber", []), 16);
// find block ~3 days ago by timestamp bisection
async function blockTime(n) { const b = await rpc(RPCS[0], "eth_getBlockByNumber", ["0x"+n.toString(16), false]); return parseInt(b.timestamp,16); }
const nowTs = await blockTime(latest);
const target = nowTs - 3*86400;
let lo = latest - 2_000_000, hi = latest;
while (hi - lo > 1000) { const mid = (lo+hi)>>1; (await blockTime(mid)) < target ? lo = mid : hi = mid; await sleep(50); }
console.log(`latest=${latest}, 3-days-ago block ≈ ${lo} (${latest-lo} blocks to scan)`);

const CHUNK = 5_000;
const logs = []; const failed = [];
let i = 0;
for (let from = lo; from < latest; from += CHUNK) {
  const to = Math.min(from + CHUNK - 1, latest);
  let ok = false;
  for (let attempt = 0; attempt < 6 && !ok; attempt++) {
    const url = RPCS[(i + attempt) % RPCS.length];
    try {
      const res = await rpc(url, "eth_getLogs", [{ fromBlock: "0x"+from.toString(16), toBlock: "0x"+to.toString(16), address: USDT, topics: [T, null, toTopic] }]);
      logs.push(...res); ok = true;
    } catch (e) { await sleep(400 * (attempt+1)); }
  }
  if (!ok) failed.push(from);
  i++; await sleep(250);
}
console.log(`done. failed chunks: ${failed.length}${failed.length ? " ("+failed.join(",")+")" : ""} | transfers found: ${logs.length}`);
for (const l of logs) {
  let ts = "?";
  try { const b = await rpc(RPCS[0], "eth_getBlockByNumber", [l.blockNumber, false]); ts = new Date(parseInt(b.timestamp,16)*1000).toISOString(); } catch {}
  console.log(`${ts}  from 0x${l.topics[1].slice(26)}  ${Number(BigInt(l.data))/1e18} USDT  tx ${l.transactionHash}`);
}
