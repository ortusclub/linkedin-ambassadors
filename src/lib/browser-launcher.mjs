// Custom Chromium browser launcher — replaces GoLogin
// Each profile gets a persistent data directory with fingerprint spoofing

import puppeteer from 'puppeteer';
import proxyChain from 'proxy-chain';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const command = process.argv[2];
const dataJson = process.argv[3];
const data = JSON.parse(dataJson);

// Fingerprint spoofing script injected into every page
const FINGERPRINT_SCRIPT = (config) => `
  // Override canvas fingerprint
  const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function(type) {
    const ctx = this.getContext('2d');
    if (ctx) {
      const imageData = ctx.getImageData(0, 0, this.width, this.height);
      for (let i = 0; i < imageData.data.length; i += 4) {
        imageData.data[i] ^= ${config.canvasNoise};
      }
      ctx.putImageData(imageData, 0, 0);
    }
    return origToDataURL.apply(this, arguments);
  };

  // Override WebGL fingerprint
  const origGetParameter = WebGLRenderingContext.prototype.getParameter;
  WebGLRenderingContext.prototype.getParameter = function(param) {
    if (param === 37445) return '${config.webglVendor}';
    if (param === 37446) return '${config.webglRenderer}';
    return origGetParameter.apply(this, arguments);
  };
  if (typeof WebGL2RenderingContext !== 'undefined') {
    const origGetParameter2 = WebGL2RenderingContext.prototype.getParameter;
    WebGL2RenderingContext.prototype.getParameter = function(param) {
      if (param === 37445) return '${config.webglVendor}';
      if (param === 37446) return '${config.webglRenderer}';
      return origGetParameter2.apply(this, arguments);
    };
  }

  // Override navigator properties
  Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => ${config.cpuCores} });
  Object.defineProperty(navigator, 'deviceMemory', { get: () => ${config.deviceMemory} });
  Object.defineProperty(navigator, 'platform', { get: () => '${config.platform}' });
  Object.defineProperty(navigator, 'languages', { get: () => ${JSON.stringify(config.languages)} });

  // Override screen properties
  Object.defineProperty(screen, 'width', { get: () => ${config.screenWidth} });
  Object.defineProperty(screen, 'height', { get: () => ${config.screenHeight} });
  Object.defineProperty(screen, 'colorDepth', { get: () => ${config.colorDepth} });

  // Prevent WebRTC IP leak
  if (typeof RTCPeerConnection !== 'undefined') {
    const origRTC = RTCPeerConnection;
    window.RTCPeerConnection = function(...args) {
      if (args[0] && args[0].iceServers) {
        args[0].iceServers = [];
      }
      return new origRTC(...args);
    };
    window.RTCPeerConnection.prototype = origRTC.prototype;
  }
`;

// Generate a consistent fingerprint config from a seed (profile ID)
function generateFingerprint(seed) {
  const hash = (s) => crypto.createHash('md5').update(seed + s).digest('hex');
  const num = (s, min, max) => min + (parseInt(hash(s).slice(0, 8), 16) % (max - min + 1));

  const webglVendors = ['Google Inc. (Intel)', 'Google Inc. (Apple)', 'Google Inc. (NVIDIA)'];
  const webglRenderers = [
    'ANGLE (Intel, Intel(R) Iris(TM) Plus Graphics, OpenGL 4.1)',
    'ANGLE (Apple, Apple M1, OpenGL 4.1)',
    'ANGLE (NVIDIA, NVIDIA GeForce GTX 1650, OpenGL 4.1)',
    'ANGLE (Intel, Intel(R) UHD Graphics 630, OpenGL 4.1)',
    'ANGLE (Apple, Apple M2, OpenGL 4.1)',
  ];

  const platforms = ['MacIntel', 'Win32'];
  const resolutions = [[1920, 1080], [2560, 1440], [1680, 1050], [1440, 900], [1536, 864]];
  const res = resolutions[num('res', 0, resolutions.length - 1)];

  return {
    canvasNoise: num('canvas', 1, 5),
    webglVendor: webglVendors[num('vendor', 0, webglVendors.length - 1)],
    webglRenderer: webglRenderers[num('renderer', 0, webglRenderers.length - 1)],
    cpuCores: [4, 8, 12, 16][num('cpu', 0, 3)],
    deviceMemory: [4, 8, 16][num('mem', 0, 2)],
    platform: platforms[num('plat', 0, platforms.length - 1)],
    languages: ['en-US', 'en'],
    screenWidth: res[0],
    screenHeight: res[1],
    colorDepth: 24,
    userAgent: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${num('chrome', 120, 131)}.0.${num('build', 5000, 7000)}.${num('patch', 50, 200)} Safari/537.36`,
    timezone: 'America/New_York',
  };
}

// Load or create profile config (fingerprint + proxy)
function getProfileDir(profileId, incomingProxy) {
  const dir = path.join(process.cwd(), 'profiles', profileId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const configPath = path.join(dir, 'profile.json');
  let config;
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } else {
    config = {
      fingerprint: generateFingerprint(profileId),
      proxy: incomingProxy || null,
      createdAt: new Date().toISOString(),
    };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  }

  // If profile exists but has no proxy and one was provided, save it
  if (!config.proxy && incomingProxy) {
    config.proxy = incomingProxy;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  }

  return { dir, config };
}

if (command === 'launch') {
  const { profileId, accountName, proxy } = data;

  const { dir, config } = getProfileDir(profileId, proxy);
  const fp = config.fingerprint;
  const savedProxy = config.proxy;
  const userDataDir = path.join(dir, 'chrome-data');

  process.stderr.write(`Launching profile ${profileId} (${accountName || 'unnamed'})...\n`);
  process.stderr.write(`User data dir: ${userDataDir}\n`);
  process.stderr.write(`Fingerprint: UA=${fp.userAgent.slice(-30)}, Screen=${fp.screenWidth}x${fp.screenHeight}\n`);
  if (savedProxy) {
    process.stderr.write(`Proxy (saved): ${savedProxy.host}:${savedProxy.port}\n`);
  } else {
    process.stderr.write(`Proxy: none\n`);
  }

  const args = [
    '--start-maximized',
    '--disable-blink-features=AutomationControlled',
    '--disable-features=IsolateOrigins,site-per-process',
    `--window-size=${fp.screenWidth},${fp.screenHeight}`,
    `--user-agent=${fp.userAgent}`,
    `--lang=${fp.languages[0]}`,
  ];

  // Set up proxy with transparent authentication via proxy-chain
  // This creates a local proxy that handles auth automatically — no popup
  let localProxyUrl = null;
  if (savedProxy && savedProxy.host) {
    const proxyUrl = `http://${savedProxy.username || ''}:${savedProxy.password || ''}@${savedProxy.host}:${savedProxy.port || 80}`;
    localProxyUrl = await proxyChain.anonymizeProxy(proxyUrl);
    args.push(`--proxy-server=${localProxyUrl}`);
    process.stderr.write(`Local proxy: ${localProxyUrl}\n`);
  }

  const browser = await puppeteer.launch({
    headless: false,
    userDataDir,
    args,
    defaultViewport: null,
    ignoreDefaultArgs: ['--enable-automation'],
  });

  // Inject fingerprint spoofing into all pages
  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();

  // Set up fingerprint injection for all new pages
  const injectFingerprint = async (p) => {
    try {
      await p.evaluateOnNewDocument(FINGERPRINT_SCRIPT(fp));
    } catch { /* ignore */ }
  };

  await injectFingerprint(page);
  browser.on('targetcreated', async (target) => {
    try {
      const p = await target.page();
      if (p) await injectFingerprint(p);
    } catch { /* ignore */ }
  });

  // Set title for identification
  const title = accountName ? `LA - ${accountName}` : `LA - ${profileId}`;
  await page.evaluate((t) => { document.title = t; }, title);

  // Navigate to LinkedIn
  try {
    await page.goto('https://www.linkedin.com/login', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.evaluate((t) => { document.title = t; }, title);
  } catch (e) {
    process.stderr.write(`Navigation error (continuing): ${e.message}\n`);
  }

  // Bring to front on macOS
  try {
    const { execSync } = await import('child_process');
    execSync(`osascript -e 'tell application "Google Chrome" to activate' 2>/dev/null || osascript -e 'tell application "Chromium" to activate' 2>/dev/null`, { timeout: 3000 });
  } catch { /* ignore */ }

  process.stderr.write('Browser launched successfully\n');

  // Output success
  console.log(JSON.stringify({ status: 'launched', profileId }));

  // Cleanup function
  const cleanup = async () => {
    if (localProxyUrl) {
      try { await proxyChain.closeAnonymizedProxy(localProxyUrl, true); } catch {}
    }
  };

  // Watch for browser close — save session automatically
  browser.on('disconnected', async () => {
    process.stderr.write('Browser closed — session saved in user data dir\n');
    await cleanup();
    process.exit(0);
  });

  // Keep alive, listen for stop command
  process.stdin.resume();
  process.stdin.on('data', async (chunk) => {
    const msg = chunk.toString().trim();
    if (msg === 'stop') {
      process.stderr.write('Stop command received — closing browser gracefully\n');
      try {
        await browser.close();
        await new Promise(r => setTimeout(r, 2000));
        process.stderr.write('Browser closed, cookies saved\n');
      } catch { /* already closed */ }
      await cleanup();
      process.exit(0);
    }
  });
}
