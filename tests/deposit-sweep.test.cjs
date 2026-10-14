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

test('USDT-only sweep funds gas, records token and preserves USDC tracker', async () => {
  const f = fixture({ USDT: 50_000_000n, eth: 0n });
  const result = await f.sweepDeposits();
  assert.deepEqual(result, [{ address: '0xabc', amount: '50.0', txHash: 'hash-USDT', token: 'USDT' }]);
  assert.deepEqual(f.calls.sends, [{ symbol: 'USDT', to: '0xtreasury', amount: 50_000_000n }]);
  assert.equal(f.calls.funding[0].value, ethers.parseEther('0.0005'));
  assert.equal(f.calls.ledger[0].description, 'Swept 50.0 USDT to treasury');
  assert.equal(f.calls.ledger[0].type, 'sweep');
  assert.equal(f.calls.resets.length, 0);
});

test('both tokens sweep and only USDC resets its tracker', async () => {
  const f = fixture({ USDC: 2_000_000n, USDT: 50_000_000n });
  assert.equal((await f.sweepDeposits()).length, 2);
  assert.equal(f.calls.resets.length, 1);
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
