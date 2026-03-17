const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// API base URL
const API_BASE = 'https://klabber.co';

// Store profile data in user's app data directory
const PROFILES_DIR = path.join(app.getPath('userData'), 'profiles');
const AUTH_FILE = path.join(app.getPath('userData'), 'auth.json');

// Proxy pool — round robin
const PROXIES = [
  { host: "108.61.251.204", port: 11290, username: "LGqxTE", password: "41DBeB" },
  { host: "149.28.161.95", port: 13325, username: "P57nTR", password: "n6eM7E" },
  { host: "104.238.190.248", port: 10748, username: "faF7K4", password: "Kgyv2q" },
  { host: "217.69.6.173", port: 11628, username: "ZQgoCH", password: "d33ghf" },
  { host: "217.69.6.173", port: 11629, username: "ZQgoCH", password: "d33ghf" },
  { host: "217.69.6.173", port: 11630, username: "ZQgoCH", password: "d33ghf" },
  { host: "217.69.6.173", port: 11631, username: "ZQgoCH", password: "d33ghf" },
  { host: "85.195.81.150", port: 12880, username: "SW8rTn", password: "HwS8B2" },
  { host: "85.195.81.150", port: 12882, username: "SW8rTn", password: "HwS8B2" },
  { host: "85.195.81.150", port: 12879, username: "SW8rTn", password: "HwS8B2" },
  { host: "85.195.81.150", port: 12877, username: "SW8rTn", password: "HwS8B2" },
  { host: "85.195.81.150", port: 12872, username: "SW8rTn", password: "HwS8B2" },
  { host: "85.195.81.150", port: 12871, username: "SW8rTn", password: "HwS8B2" },
  { host: "85.195.81.150", port: 12876, username: "SW8rTn", password: "HwS8B2" },
  { host: "85.195.81.150", port: 12875, username: "SW8rTn", password: "HwS8B2" },
  { host: "85.195.81.150", port: 12874, username: "SW8rTn", password: "HwS8B2" },
  { host: "85.195.81.150", port: 12873, username: "SW8rTn", password: "HwS8B2" },
  { host: "85.195.81.150", port: 12870, username: "SW8rTn", password: "HwS8B2" },
  { host: "85.195.81.150", port: 12869, username: "SW8rTn", password: "HwS8B2" },
  { host: "85.195.81.150", port: 12868, username: "SW8rTn", password: "HwS8B2" },
];
let proxyIndex = Math.floor(Math.random() * PROXIES.length);
function getNextProxy() {
  const proxy = PROXIES[proxyIndex];
  proxyIndex = (proxyIndex + 1) % PROXIES.length;
  return proxy;
}

let mainWindow = null;
let puppeteerBrowser = null;
let localProxyUrl = null;
let runningProfileId = null;

// --- Auth persistence ---
function loadAuth() {
  try {
    if (fs.existsSync(AUTH_FILE)) {
      return JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
    }
  } catch {}
  return null;
}

function saveAuth(data) {
  fs.writeFileSync(AUTH_FILE, JSON.stringify(data, null, 2));
}

function clearAuth() {
  try { fs.unlinkSync(AUTH_FILE); } catch {}
}

// --- Fingerprint ---
function generateFingerprint(seed) {
  const hash = (s) => crypto.createHash('md5').update(seed + s).digest('hex');
  const num = (s, min, max) => min + (parseInt(hash(s).slice(0, 8), 16) % (max - min + 1));

  const webglRenderers = [
    'ANGLE (Intel, Intel(R) Iris(TM) Plus Graphics, OpenGL 4.1)',
    'ANGLE (Apple, Apple M1, OpenGL 4.1)',
    'ANGLE (NVIDIA, NVIDIA GeForce GTX 1650, OpenGL 4.1)',
    'ANGLE (Intel, Intel(R) UHD Graphics 630, OpenGL 4.1)',
    'ANGLE (Apple, Apple M2, OpenGL 4.1)',
  ];

  return {
    canvasNoise: num('canvas', 1, 5),
    webglVendor: 'Google Inc. (Intel)',
    webglRenderer: webglRenderers[num('renderer', 0, webglRenderers.length - 1)],
    cpuCores: [4, 8, 12, 16][num('cpu', 0, 3)],
    deviceMemory: [4, 8, 16][num('mem', 0, 2)],
    platform: 'MacIntel',
    languages: ['en-US', 'en'],
    screenWidth: 1920,
    screenHeight: 1080,
    colorDepth: 24,
    userAgent: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${num('chrome', 120, 131)}.0.${num('build', 5000, 7000)}.${num('patch', 50, 200)} Safari/537.36`,
  };
}

// --- Profile management ---
function getProfileDir(profileId, incomingProxy) {
  const dir = path.join(PROFILES_DIR, profileId);
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

  if (!config.proxy && incomingProxy) {
    config.proxy = incomingProxy;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  }

  return { dir, config };
}

function listProfiles() {
  if (!fs.existsSync(PROFILES_DIR)) return [];
  const dirs = fs.readdirSync(PROFILES_DIR);
  const profiles = [];

  for (const dirName of dirs) {
    const configPath = path.join(PROFILES_DIR, dirName, 'profile.json');
    if (!fs.existsSync(configPath)) continue;
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      profiles.push({
        id: dirName,
        name: config.name || dirName,
        email: config.email || '',
        linkedinUrl: config.linkedinUrl || '',
        proxy: config.proxy ? `${config.proxy.host}:${config.proxy.port}` : 'None',
        createdAt: config.createdAt || '',
        status: config.status || 'ready',
        monthlyPayment: config.monthlyPayment || null,
        isRunning: runningProfileId === dirName,
      });
    } catch {}
  }

  return profiles.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

function saveProfileMeta(profileId, meta) {
  const configPath = path.join(PROFILES_DIR, profileId, 'profile.json');
  if (!fs.existsSync(configPath)) return;
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  Object.assign(config, meta);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function deleteProfile(profileId) {
  const dir = path.join(PROFILES_DIR, profileId);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// --- Window ---
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 550,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#f9fafb',
    trafficLightPosition: { x: 16, y: 16 },
  });

  mainWindow.loadFile('index.html');
}

// --- Browser launch ---
async function openBrowser(profileId, proxyConfig) {
  runningProfileId = profileId;
  const { dir, config } = getProfileDir(profileId, proxyConfig);
  const fp = config.fingerprint;
  const savedProxy = config.proxy;
  const userDataDir = path.join(dir, 'chrome-data');

  // Clear session restore files so Chrome doesn't reopen old tabs
  const sessionFiles = ['Last Session', 'Last Tabs', 'Current Session', 'Current Tabs'];
  for (const f of sessionFiles) {
    const fp1 = path.join(userDataDir, 'Default', f);
    try { if (fs.existsSync(fp1)) fs.unlinkSync(fp1); } catch {}
  }

  const puppeteer = require('puppeteer');

  const args = [
    '--start-maximized',
    '--disable-blink-features=AutomationControlled',
    `--window-size=${fp.screenWidth},${fp.screenHeight}`,
    `--user-agent=${fp.userAgent}`,
    `--lang=${fp.languages[0]}`,
    // Anti-detection flags
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-infobars',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-component-update',
    '--disable-sync',
    '--disable-session-crashed-bubble',
    '--hide-crash-restore-bubble',
  ];

  // Set up proxy with transparent auth via proxy-chain (no auth popup)
  localProxyUrl = null;
  if (savedProxy && savedProxy.host) {
    const proxyChain = require('proxy-chain');
    const proxyUrl = `http://${savedProxy.username || ''}:${savedProxy.password || ''}@${savedProxy.host}:${savedProxy.port || 80}`;
    localProxyUrl = await proxyChain.anonymizeProxy(proxyUrl);
    args.push(`--proxy-server=${localProxyUrl}`);
  }

  // Resolve bundled Chromium path — in packaged app it's in app.asar.unpacked/
  let executablePath;
  if (app.isPackaged) {
    const resourcesDir = path.dirname(process.resourcesPath ? process.resourcesPath + '/app.asar' : __dirname);
    const unpackedDir = path.join(resourcesDir, 'app.asar.unpacked', '.chromium');
    // Find the chrome binary dynamically
    const chromeDir = path.join(unpackedDir, 'chrome');
    const versions = fs.readdirSync(chromeDir).filter(d => d.startsWith('mac'));
    if (versions.length > 0) {
      const platform = versions[0];
      const appName = 'Google Chrome for Testing';
      executablePath = path.join(chromeDir, platform, 'chrome-mac-arm64', `${appName}.app`, 'Contents', 'MacOS', appName);
    }
  }

  puppeteerBrowser = await puppeteer.launch({
    headless: false,
    ...(executablePath ? { executablePath } : {}),
    userDataDir,
    args,
    defaultViewport: null,
    ignoreDefaultArgs: [
      '--enable-automation',
      '--enable-blink-features=IdleDetection',
    ],
  });

  // Close all restored tabs immediately to prevent them hitting old proxy URLs
  const restoredPages = await puppeteerBrowser.pages();
  for (let i = 1; i < restoredPages.length; i++) {
    try { await restoredPages[i].close(); } catch {}
  }
  const page = restoredPages[0] || await puppeteerBrowser.newPage();

  const fingerprintScript = `
    // Hide webdriver flag
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

    // Remove automation-related properties
    delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
    delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
    delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;

    // Hide chrome.runtime to avoid detection (puppeteer injects this)
    if (window.chrome) {
      window.chrome.runtime = undefined;
    }

    // Spoof plugins to look like a real browser
    Object.defineProperty(navigator, 'plugins', {
      get: () => {
        const plugins = [
          { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
          { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
          { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
        ];
        plugins.length = 3;
        return plugins;
      }
    });

    // Spoof permissions API
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => {
      if (parameters.name === 'notifications') {
        return Promise.resolve({ state: Notification.permission });
      }
      return originalQuery(parameters);
    };

    // Canvas fingerprint
    const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function(type) {
      const ctx = this.getContext('2d');
      if (ctx) {
        try {
          const imageData = ctx.getImageData(0, 0, this.width, this.height);
          for (let i = 0; i < imageData.data.length; i += 4) { imageData.data[i] ^= ${fp.canvasNoise}; }
          ctx.putImageData(imageData, 0, 0);
        } catch {}
      }
      return origToDataURL.apply(this, arguments);
    };

    // WebGL fingerprint
    const origGetParam = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(p) {
      if (p === 37445) return '${fp.webglVendor}';
      if (p === 37446) return '${fp.webglRenderer}';
      return origGetParam.apply(this, arguments);
    };

    // Hardware spoofing
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => ${fp.cpuCores} });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => ${fp.deviceMemory} });
    Object.defineProperty(navigator, 'platform', { get: () => '${fp.platform}' });
    Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 0 });

    // Prevent WebRTC IP leak
    if (typeof RTCPeerConnection !== 'undefined') {
      const origRTC = RTCPeerConnection;
      window.RTCPeerConnection = function(...a) {
        if (a[0] && a[0].iceServers) a[0].iceServers = [];
        return new origRTC(...a);
      };
      window.RTCPeerConnection.prototype = origRTC.prototype;
    }
  `;

  await page.evaluateOnNewDocument(fingerprintScript);

  try {
    await page.goto('https://www.linkedin.com/login', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
  } catch (e) {
    console.error('Navigation error:', e.message);
  }

  puppeteerBrowser.on('disconnected', () => {
    const closedProfileId = runningProfileId;
    puppeteerBrowser = null;
    runningProfileId = null;
    // Clean up local proxy
    if (localProxyUrl) { try { require("proxy-chain").closeAnonymizedProxy(localProxyUrl, true); } catch {} localProxyUrl = null; }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('browser-closed');
    }
    // Register with backend when browser closes (user logged into LinkedIn)
    if (closedProfileId) {
      registerProfileWithBackend(closedProfileId);
    }
  });
}

// --- IPC Handlers ---

// Auth
ipcMain.handle('auth:check', async () => {
  return loadAuth();
});

ipcMain.handle('auth:send-verification', async (event, { email }) => {
  try {
    const response = await fetch(`${API_BASE}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to send verification code' };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message || 'Could not connect to server' };
  }
});

ipcMain.handle('auth:verify-code', async (event, { email, code }) => {
  try {
    const response = await fetch(`${API_BASE}/api/auth/verify-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });

    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.error || 'Verification failed' };
    }

    // Save auth data locally
    const authData = {
      email: data.user.email,
      fullName: data.user.fullName,
      userId: data.user.id,
      role: data.user.role,
      token: data.token,
    };
    saveAuth(authData);
    return { success: true, ...authData };
  } catch (err) {
    return { success: false, error: err.message || 'Could not connect to server' };
  }
});

ipcMain.handle('auth:logout', async () => {
  clearAuth();
  return { success: true };
});

// Profiles
ipcMain.handle('profiles:list', async () => {
  const localProfiles = listProfiles();

  // Also try to fetch server-side profiles for this user
  try {
    const auth = loadAuth();
    if (auth && auth.token) {
      const response = await fetch(`${API_BASE}/api/ambassador/my-accounts`, {
        headers: { 'Authorization': `Bearer ${auth.token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const serverAccounts = data.accounts || [];

        // Merge: add server accounts that don't exist locally
        const localIds = new Set(localProfiles.map(p => p.email));
        for (const account of serverAccounts) {
          const ownerEmail = (account.notes || '').match(/Owner:\s*([^\s.]+@[^\s.]+\.[^\s.]+)/)?.[1] || '';
          if (ownerEmail && !localIds.has(ownerEmail)) {
            // Server account not in local — add it to the list
            localProfiles.push({
              id: account.gologinProfileId || account.id,
              name: (account.linkedinName || '').replace(/\s*\(.*\)\s*$/, ''),
              email: ownerEmail,
              linkedinUrl: account.linkedinUrl || '',
              proxy: 'Server',
              createdAt: account.createdAt || '',
              status: account.status || 'ready',
              monthlyPayment: account.monthlyPrice ? Number(account.monthlyPrice) : null,
              isRunning: false,
            });
          }
        }
      }
    }
  } catch {}

  return localProfiles;
});

ipcMain.handle('profiles:add', async (event, { name, email, linkedinUrl }) => {
  const profileId = email.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  const proxy = getNextProxy();
  getProfileDir(profileId, proxy);
  saveProfileMeta(profileId, { name, email, linkedinUrl, status: 'ready', registered: false });

  // Immediately register with backend
  await registerProfileWithBackend(profileId);

  return { success: true, profileId };
});

ipcMain.handle('rentals:list', async () => {
  try {
    const auth = loadAuth();
    if (!auth || !auth.token) return [];
    const response = await fetch(`${API_BASE}/api/rentals`, {
      headers: { 'Authorization': `Bearer ${auth.token}` },
    });
    if (response.ok) {
      const data = await response.json();
      return (data.rentals || []).filter(r => r.status === 'active' || r.status === 'payment_failed');
    }
  } catch {}
  return [];
});

ipcMain.handle('profiles:delete', async (event, { profileId }) => {
  if (runningProfileId === profileId) {
    if (puppeteerBrowser) {
      try { await puppeteerBrowser.close(); } catch {}
      puppeteerBrowser = null;
    // Clean up local proxy
    if (localProxyUrl) { try { const pc = require("proxy-chain"); pc.closeAnonymizedProxy(localProxyUrl, true); } catch {} }
      runningProfileId = null;
    }
  }
  deleteProfile(profileId);
  return { success: true };
});

// Register a profile with the backend (creates LinkedInAccount + User in the admin system)
async function registerProfileWithBackend(profileId) {
  const configPath = path.join(PROFILES_DIR, profileId, 'profile.json');
  if (!fs.existsSync(configPath)) return;

  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  if (config.registered) return; // Already registered

  try {
    const auth = loadAuth();
    const response = await fetch(`${API_BASE}/api/ambassador/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: config.name || 'Ambassador',
        email: config.email || (auth && auth.email) || '',
        linkedinUrl: config.linkedinUrl || '',
        connectionCount: 0,
        gologinProfileId: profileId,
        offeredAmount: config.monthlyPayment || 50,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      saveProfileMeta(profileId, {
        registered: true,
        linkedinAccountId: data.linkedinAccount?.id,
        monthlyPayment: data.linkedinAccount ? (config.monthlyPayment || 50) : null,
      });
      console.log('Profile registered with backend:', profileId);
    } else {
      const err = await response.json().catch(() => ({}));
      console.error('Failed to register profile:', err.error || response.status);
    }
  } catch (err) {
    console.error('Could not register profile with backend:', err.message);
  }
}

// Browser
ipcMain.handle('browser:run', async (event, { profileId }) => {
  if (puppeteerBrowser) {
    return { success: false, error: 'A browser is already running. Stop it first.' };
  }
  const proxy = getNextProxy();
  await openBrowser(profileId, proxy);
  return { success: true };
});

ipcMain.handle('browser:stop', async () => {
  const stoppedProfileId = runningProfileId;
  if (puppeteerBrowser) {
    try { await puppeteerBrowser.close(); } catch {}
    puppeteerBrowser = null;
    // Clean up local proxy
    if (localProxyUrl) { try { const pc = require("proxy-chain"); pc.closeAnonymizedProxy(localProxyUrl, true); } catch {} }
    runningProfileId = null;
  }
  // Register the profile with the backend after browser session is saved
  if (stoppedProfileId) {
    await registerProfileWithBackend(stoppedProfileId);
  }
  return { success: true };
});

ipcMain.handle('browser:status', async () => {
  return {
    running: !!puppeteerBrowser,
    profileId: runningProfileId,
  };
});

// Legacy — keep for backward compat with ambassador complete flow
ipcMain.handle('close-browser-and-register', async (event, { email, fullName, linkedinUrl, profileId }) => {
  if (puppeteerBrowser) {
    try { await puppeteerBrowser.close(); } catch {}
    puppeteerBrowser = null;
    // Clean up local proxy
    if (localProxyUrl) { try { const pc = require("proxy-chain"); pc.closeAnonymizedProxy(localProxyUrl, true); } catch {} }
    runningProfileId = null;
  }

  try {
    const response = await fetch(`${API_BASE}/api/ambassador/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: fullName || 'Ambassador',
        email: email,
        linkedinUrl: linkedinUrl || '',
        profileId: profileId,
        connectionCount: 0,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.error || 'Registration failed' };
    }

    return {
      success: true,
      tempPassword: data.user?.tempPassword,
      email: data.user?.email,
    };
  } catch (err) {
    return { success: false, error: err.message || 'Could not connect to server' };
  }
});

app.whenReady().then(async () => {
  createMainWindow();

  // Register any unregistered profiles with the backend on startup
  try {
    const profiles = listProfiles();
    for (const profile of profiles) {
      const configPath = path.join(PROFILES_DIR, profile.id, 'profile.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        if (!config.registered) {
          await registerProfileWithBackend(profile.id);
        }
      }
    }
  } catch (err) {
    console.error('Startup registration error:', err.message);
  }
});

app.on('window-all-closed', () => {
  if (puppeteerBrowser) {
    try { puppeteerBrowser.close(); } catch {}
  }
  app.quit();
});
