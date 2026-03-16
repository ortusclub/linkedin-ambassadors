// This runs as a standalone Node.js script, NOT bundled by Next.js/Turbopack.
// It's invoked as a child process from the API route.

import GoLogin from 'gologin';
import puppeteer from 'puppeteer-core';

const command = process.argv[2];
const dataJson = process.argv[3];
const data = JSON.parse(dataJson);

if (command === 'launch') {
  const { token, profileId } = data;

  const gl = new GoLogin({
    token,
    profile_id: profileId,
    extra_params: ['--start-maximized'],
  });

  const { status, wsUrl } = await gl.start();

  if (status !== 'success') {
    console.error(JSON.stringify({ error: 'Failed to launch browser' }));
    process.exit(1);
  }

  // Connect with Puppeteer to navigate to LinkedIn
  const browser = await puppeteer.connect({
    browserWSEndpoint: wsUrl,
    defaultViewport: null,
  });

  const pages = await browser.pages();
  const page = pages[0] || (await browser.newPage());
  await page.goto('https://www.linkedin.com/login', {
    waitUntil: 'domcontentloaded',
  });

  // Disconnect Puppeteer but keep browser open for manual use
  browser.disconnect();

  // Output success - keep process alive so GoLogin stays running
  console.log(JSON.stringify({ status: 'launched', profileId }));

  // Keep alive until we receive 'stop' on stdin
  process.stdin.resume();
  process.stdin.on('data', async (chunk) => {
    const msg = chunk.toString().trim();
    if (msg === 'stop') {
      try {
        await gl.stop();
        console.log(JSON.stringify({ status: 'stopped' }));
      } catch (e) {
        console.error(JSON.stringify({ error: e.message }));
      }
      process.exit(0);
    }
  });
}
