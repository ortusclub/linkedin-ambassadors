const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const { ethers } = require('ethers');

function load(file, dependencies) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  new Function('require', 'exports', 'console', code)(name => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
    return dependencies[name];
  }, exports, { error() {} });
  return exports;
}

function fixture(options = {}) {
  const calls = { sends: [], funding: [], ledger: [], resets: [], errors: [] };
  const provider = {
    getNetwork: async () => ({ chainId: options.chainId ?? 8453n }),
    getBalance: async () => options.eth ?? ethers.parseEther('0.001'),
  };
  const contract = symbol => () => ({
    balanceOf: async () => {
      if (options.failRead === symbol) throw new Error('RPC failure');
      return options[symbol] ?? 0n;
    },
    transfer: async (to, amount) => {
      calls.sends.push({ symbol, to, amount });
      return { wait: async () => ({ status: options.status ?? 1, hash: `hash-${symbol}` }) };
    },
  });
  const prisma = {
    depositAddress: { findMany: async () => [{ id: 'deposit', address: '0xabc', userId: 'customer', derivationIndex: 7 }] },
    $transaction: async fn => fn({
      transaction: { create: async entry => calls.ledger.push(entry.data) },
      depositAddress: { update: async entry => calls.resets.push(entry) },
      user: { update: async () => { throw new Error('Sweeps must not credit customers'); } },
    }),
  };
  const wallet = {
    getBaseProvider: () => provider,
    getTreasuryAddress: () => '0xtreasury',
    getTreasuryWallet: () => ({ sendTransaction: async tx => {
      calls.funding.push(tx);
      return { wait: async () => ({ status: options.gasStatus ?? 1 }) };
    } }),
    getChildWallet: index => {
      assert.equal(index, 7);
      return { address: options.signerAddress ?? '0xABC' };
    },
    getUsdcContract: contract('USDC'),
    getUsdtContract: contract('USDT'),
    formatUsdc: value => ethers.formatUnits(value, 6),
  };
  return { calls, ...load('src/lib/deposit-detector.ts', {
    '@/lib/prisma': { prisma }, ethers: { ethers }, '@/lib/wallet': wallet, '@/services/email': {},
  }) };
}

test('USDT-only sweep funds gas, records token and resets only the USDT tracker', async () => {
  const f = fixture({ USDT: 50_000_000n, eth: 0n });
  const result = await f.sweepDeposits();
  assert.deepEqual(result, [{ address: '0xabc', amount: '50.0', txHash: 'hash-USDT', token: 'USDT' }]);
  assert.deepEqual(f.calls.sends, [{ symbol: 'USDT', to: '0xtreasury', amount: 50_000_000n }]);
  assert.equal(f.calls.funding[0].value, ethers.parseEther('0.0005'));
  assert.equal(f.calls.ledger[0].description, 'Swept 50.0 USDT to treasury');
  assert.equal(f.calls.ledger[0].type, 'sweep');
  // The USDT tracker is reset to 0; the USDC tracker is left untouched.
  assert.equal(f.calls.resets.length, 1);
  assert.deepEqual(f.calls.resets[0].data, { lastSeenUsdtBalance: 0 });
});

test('both tokens sweep and each resets its own tracker', async () => {
  const f = fixture({ USDC: 2_000_000n, USDT: 50_000_000n });
  assert.equal((await f.sweepDeposits()).length, 2);
  assert.equal(f.calls.resets.length, 2);
  const resetFields = f.calls.resets.map(r => r.data);
  assert.ok(resetFields.some(d => 'lastSeenBalance' in d && d.lastSeenBalance === 0));
  assert.ok(resetFields.some(d => 'lastSeenUsdtBalance' in d && d.lastSeenUsdtBalance === 0));
  assert.equal(f.calls.funding.length, 0);
});

test('zero balances produce no transfers or ledger entries', async () => {
  const f = fixture();
  assert.deepEqual(await f.sweepDeposits(), []);
  assert.equal(f.calls.sends.length + f.calls.funding.length + f.calls.ledger.length, 0);
});

test('wrong derived signer cannot receive gas or send tokens', async () => {
  const f = fixture({ USDT: 50_000_000n, eth: 0n, signerAddress: '0xwrong' });
  assert.deepEqual(await f.sweepDeposits(), []);
  assert.equal(f.calls.sends.length + f.calls.funding.length, 0);
});

test('wrong network aborts before transfers', async () => {
  const f = fixture({ chainId: 1n, USDT: 50_000_000n });
  await assert.rejects(f.sweepDeposits(), /Base mainnet/);
  assert.equal(f.calls.sends.length, 0);
});

test('failed gas funding prevents token transfer', async () => {
  const f = fixture({ USDT: 50_000_000n, eth: 0n, gasStatus: 0 });
  assert.deepEqual(await f.sweepDeposits(), []);
  assert.equal(f.calls.sends.length + f.calls.ledger.length, 0);
});

test('failed receipt does not record a successful sweep or reset tracker', async () => {
  const f = fixture({ USDC: 2_000_000n, status: 0 });
  assert.deepEqual(await f.sweepDeposits(), []);
  assert.equal(f.calls.ledger.length + f.calls.resets.length, 0);
});

test('a failed USDC check does not prevent USDT sweeping', async () => {
  const f = fixture({ failRead: 'USDC', USDT: 50_000_000n });
  assert.equal((await f.sweepDeposits())[0].token, 'USDT');
});

// ── detectDeposits (crediting side) ──────────────────────────────────────────
function detectFixture(options = {}) {
  const calls = { credits: [], ledger: [], trackers: [], confirmations: [], notifications: [] };
  const contract = symbol => () => ({
    balanceOf: async () => {
      if (options.failRead === symbol) throw new Error('RPC failure');
      return options[symbol] ?? 0n;
    },
  });
  const deposit = {
    id: 'deposit', address: '0xabc', userId: 'customer', derivationIndex: 7,
    lastSeenBalance: options.lastSeenUsdc ?? '0',
    lastSeenUsdtBalance: options.lastSeenUsdt ?? '0',
    user: { email: 'renter@example.com', fullName: 'Renter' },
  };
  const prisma = {
    depositAddress: { findMany: async () => [deposit] },
    $transaction: async fn => fn({
      user: { update: async entry => calls.credits.push(entry.data.usdcBalance) },
      transaction: { create: async entry => calls.ledger.push(entry.data) },
      depositAddress: { update: async entry => calls.trackers.push(entry.data) },
    }),
  };
  const wallet = {
    getBaseProvider: () => ({}),
    getUsdcContract: contract('USDC'),
    getUsdtContract: contract('USDT'),
    formatUsdc: value => ethers.formatUnits(value, 6),
    parseUsdc: value => ethers.parseUnits(String(value), 6),
  };
  const email = {
    sendTopUpConfirmation: async entry => calls.confirmations.push(entry),
    sendTopUpNotification: async entry => calls.notifications.push(entry),
  };
  return { calls, ...load('src/lib/deposit-detector.ts', {
    '@/lib/prisma': { prisma }, ethers: { ethers }, '@/lib/wallet': wallet, '@/services/email': email,
  }) };
}

test('credits a new USDC deposit and advances the USDC tracker', async () => {
  const f = detectFixture({ USDC: 25_000_000n });
  assert.deepEqual(await f.detectDeposits(), [{ userId: 'customer', amount: '25.0', address: '0xabc', token: 'USDC' }]);
  assert.deepEqual(f.calls.credits, [{ increment: '25.0' }]);
  assert.equal(f.calls.ledger[0].description, 'USDC deposit detected at 0xabc');
  assert.equal(f.calls.ledger[0].type, 'deposit');
  assert.deepEqual(f.calls.trackers, [{ lastSeenBalance: '25.0' }]);
  assert.equal(f.calls.confirmations.length, 1);
  assert.equal(f.calls.notifications.length, 1);
});

test('credits a USDT deposit and advances the USDT tracker', async () => {
  const f = detectFixture({ USDT: 50_000_000n });
  assert.deepEqual(await f.detectDeposits(), [{ userId: 'customer', amount: '50.0', address: '0xabc', token: 'USDT' }]);
  assert.deepEqual(f.calls.credits, [{ increment: '50.0' }]);
  assert.equal(f.calls.ledger[0].description, 'USDT deposit detected at 0xabc');
  assert.deepEqual(f.calls.trackers, [{ lastSeenUsdtBalance: '50.0' }]);
});

test('only credits the USDT increase above the baseline', async () => {
  const f = detectFixture({ USDT: 70_000_000n, lastSeenUsdt: '50' });
  assert.deepEqual(await f.detectDeposits(), [{ userId: 'customer', amount: '20.0', address: '0xabc', token: 'USDT' }]);
  assert.deepEqual(f.calls.trackers, [{ lastSeenUsdtBalance: '70.0' }]);
});

test('does not re-credit USDT already accounted for in the baseline', async () => {
  // Alan's reconciliation: 50 USDT credited manually, baseline seeded to 50 by migration.
  const f = detectFixture({ USDT: 50_000_000n, lastSeenUsdt: '50' });
  assert.deepEqual(await f.detectDeposits(), []);
  assert.equal(f.calls.credits.length + f.calls.ledger.length + f.calls.trackers.length, 0);
});

test('a USDT RPC failure does not block USDC crediting', async () => {
  const f = detectFixture({ USDC: 10_000_000n, failRead: 'USDT' });
  const result = await f.detectDeposits();
  assert.equal(result.length, 1);
  assert.equal(result[0].token, 'USDC');
});

test('sweep endpoint rejects forged cron headers and missing secret', async () => {
  const previous = process.env.CRON_SECRET;
  let runs = 0;
  const route = load('src/app/api/cron/detect-deposits/route.ts', {
    'next/server': { NextResponse: { json: (data, init) => ({ data, status: init?.status ?? 200 }) } },
    '@/lib/deposit-detector': {
      detectDeposits: async () => { runs++; return []; }, sweepDeposits: async () => [],
    },
  });
  try {
    delete process.env.CRON_SECRET;
    assert.equal((await route.GET({ headers: new Headers({ authorization: 'Bearer undefined', 'x-vercel-cron': '1' }) })).status, 401);
    process.env.CRON_SECRET = 'test-secret';
    assert.equal((await route.POST({ headers: new Headers({ 'x-vercel-cron': '1' }) })).status, 401);
    assert.equal(runs, 0);
    assert.equal((await route.GET({ headers: new Headers({ authorization: 'Bearer test-secret' }) })).status, 200);
    assert.equal(runs, 1);
  } finally {
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  }
});
