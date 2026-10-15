const { test } = require('node:test');
const assert = require('node:assert/strict');
const puppeteer = require('puppeteer');

// Run explicitly against a local dev server. All API data and wallet calls are mocked.
test('Treasury balances and wallet review work on desktop and mobile without signing', { skip: !process.env.TREASURY_TEST_URL, timeout: 150000 }, async () => {
  const origin = new URL(process.env.TREASURY_TEST_URL);
  assert.ok(['localhost', '127.0.0.1'].includes(origin.hostname), 'Only local servers may be used');
  const browser = await puppeteer.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width: 1440, height: 1100 });
    await page.setCookie({ name: 'session_token', value: 'local-ui-fixture', domain: origin.hostname, path: '/' });
    const snapshot = {
      checkedAt: new Date().toISOString(),
      stripe: { status: 'ready', live: true, balances: [{ currency: 'USD', available: '1234.56', pending: '89.1' }, { currency: 'EUR', available: '52.00', pending: '0.0' }], error: null },
      crypto: { address: '0x1111111111111111111111111111111111111111', network: 'Base', assets: [
        { token: 'ETH', amount: '0.0108', usdValue: 27, error: null },
        { token: 'USDC', amount: '120.0', usdValue: 120, error: null },
        { token: 'USDT', amount: '50.0', usdValue: 50, error: null },
      ], error: null },
    };
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.pathname === '/api/auth/me') return request.respond({ contentType: 'application/json', body: JSON.stringify({ user: { role: 'admin', fullName: 'Test admin' } }) });
      if (url.pathname === '/api/admin/treasury') return request.respond({ contentType: 'application/json', body: JSON.stringify(snapshot) });
      if (url.pathname.startsWith('/api/')) return request.respond({ contentType: 'application/json', body: '{}' });
      if (url.hostname !== origin.hostname) return request.abort();
      return request.continue();
    });
    await page.evaluateOnNewDocument(() => {
      window.__walletSends = 0;
      window.ethereum = { request: async ({ method }) => {
        switch (method) {
          case 'eth_requestAccounts': case 'eth_accounts': return ['0x1111111111111111111111111111111111111111'];
          case 'eth_chainId': return '0x2105';
          case 'eth_getBalance': return '0x16345785d8a0000';
          case 'eth_call': return '0x' + (120000000).toString(16).padStart(64, '0');
          case 'eth_estimateGas': return '0xc350';
          case 'eth_sendTransaction': window.__walletSends++; throw Error('Signing disabled in UI test');
          default: throw Error('Unexpected wallet request ' + method);
        }
      } };
    });
    await page.goto(new URL('/admin/treasury', origin).href, { waitUntil: 'networkidle0', timeout: 120000 });
    await page.waitForFunction(() => document.body.innerText.includes('$1,234.56'), { timeout: 30000 });
    assert.match(await page.$eval('body', element => element.innerText), /\$197.00/);
    const screenshot = async name => {
      if (process.env.TREASURY_SCREENSHOTS) await page.screenshot({ path: `${process.env.TREASURY_SCREENSHOTS}/${name}.png`, fullPage: true });
    };
    await screenshot('desktop');
    const clickText = text => page.evaluate(label => {
      const button = [...document.querySelectorAll('button')].find(element => element.textContent.includes(label));
      if (!button) throw Error('Missing button ' + label);
      button.click();
    }, text);
    await clickText('Move crypto to SwissBorg');
    await page.waitForSelector('dialog[open]');
    const fields = await page.$$('dialog input');
    await fields[0].type('50');
    await fields[1].type('0x2222222222222222222222222222222222222222');
    await clickText('Connect wallet & review');
    await page.waitForFunction(() => document.querySelector('dialog')?.innerText.includes('From treasury'), { timeout: 10000 });
    assert.equal(await page.evaluate(() => window.__walletSends), 0);
    assert.equal(await page.evaluate(() => [...document.querySelectorAll('dialog button')].find(button => button.textContent === 'Confirm in wallet').disabled), true);
    await screenshot('review');
    await clickText('Back');
    await clickText('Cancel');
    await page.setViewport({ width: 390, height: 844 });
    await screenshot('mobile');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
