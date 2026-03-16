// This runs as a standalone Node.js script, NOT bundled by Next.js/Turbopack.
// It's invoked as a child process from the API route.

import GoLogin from 'gologin';
import puppeteer from 'puppeteer-core';
import { execSync } from 'child_process';

const command = process.argv[2];
const dataJson = process.argv[3];
const data = JSON.parse(dataJson);

if (command === 'launch') {
  const { token, profileId, accountName } = data;

  const gl = new GoLogin({
    token,
    profile_id: profileId,
    extra_params: ['--start-maximized'],
    headless: false,
    autoUpdateBrowser: true,
  });

  process.stderr.write(`Starting GoLogin profile ${profileId}...\n`);

  let startResult;
  try {
    startResult = await gl.start();
  } catch (e) {
    process.stderr.write(`GoLogin start error: ${e.message}\n`);
    console.log(JSON.stringify({ error: e.message }));
    process.exit(1);
  }

  const { status, wsUrl } = startResult;
  process.stderr.write(`GoLogin start status: ${status}, wsUrl: ${wsUrl ? 'yes' : 'no'}\n`);

  if (status !== 'success' || !wsUrl) {
    console.log(JSON.stringify({ error: `Failed to launch browser (status: ${status})` }));
    process.exit(1);
  }

  // Connect with Puppeteer to navigate to LinkedIn and set window title
  try {
    const browser = await puppeteer.connect({
      browserWSEndpoint: wsUrl,
      defaultViewport: null,
    });

    const pages = await browser.pages();
    const page = pages[0] || (await browser.newPage());

    // Set the window title so it's identifiable in the dock
    const title = accountName ? `LA - ${accountName}` : `LA - ${profileId}`;
    await page.evaluate((t) => { document.title = t; }, title);

    await page.goto('https://www.linkedin.com/login', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    // Set title again after navigation
    await page.evaluate((t) => { document.title = t; }, title);

    // Watch for browser disconnect (user closed window manually)
    browser.on('disconnected', async () => {
      process.stderr.write('Browser window closed by user — saving session...\n');
      try {
        await gl.stop();
        process.stderr.write('Session saved successfully after manual close\n');
      } catch (e) {
        process.stderr.write(`Failed to save session: ${e.message}\n`);
      }
      process.exit(0);
    });

    // Disconnect Puppeteer but keep watching for browser close
    // We use a second connection just for monitoring
    browser.disconnect();

    // Reconnect just to monitor for close
    try {
      const monitor = await puppeteer.connect({
        browserWSEndpoint: wsUrl,
        defaultViewport: null,
      });
      monitor.on('disconnected', async () => {
        process.stderr.write('Browser closed — saving session...\n');
        try {
          await gl.stop();
          process.stderr.write('Session saved after browser close\n');
        } catch (e) {
          process.stderr.write(`Save error: ${e.message}\n`);
        }
        process.exit(0);
      });
    } catch {
      process.stderr.write('Could not set up close monitor\n');
    }

    process.stderr.write('Browser launched and navigated to LinkedIn\n');
  } catch (e) {
    process.stderr.write(`Puppeteer error (browser still open): ${e.message}\n`);
  }

  // Bring the browser window to the front on macOS
  try {
    execSync(`osascript -e 'tell application "Orbita" to activate'`, { timeout: 5000 });
  } catch {
    // Try alternative name
    try {
      execSync(`osascript -e 'tell application "System Events" to set frontmost of (first process whose name contains "Orbita") to true'`, { timeout: 5000 });
    } catch {
      process.stderr.write('Could not bring window to front automatically\n');
    }
  }

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
        process.stderr.write(`Stop error: ${e.message}\n`);
      }
      process.exit(0);
    }
  });
}
