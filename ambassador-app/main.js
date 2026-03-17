const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// API base URL
const API_BASE = 'http://localhost:3000';
// For production: const API_BASE = 'https://klabber.co';

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

  const puppeteer = require('puppeteer');

  const args = [
    '--start-maximized',
    '--disable-blink-features=AutomationControlled',
    '--disable-features=IsolateOrigins,site-per-process',
    `--window-size=${fp.screenWidth},${fp.screenHeight}`,
    `--user-agent=${fp.userAgent}`,
    `--lang=${fp.languages[0]}`,
  ];

  if (savedProxy && savedProxy.host) {
    args.push(`--proxy-server=http://${savedProxy.host}:${savedProxy.port || 80}`);
  }

  puppeteerBrowser = await puppeteer.launch({
    headless: false,
    userDataDir,
    args,
    defaultViewport: null,
    ignoreDefaultArgs: ['--enable-automation'],
  });

  const pages = await puppeteerBrowser.pages();
  const page = pages[0] || await puppeteerBrowser.newPage();

  if (savedProxy && savedProxy.username && savedProxy.password) {
    await page.authenticate({
      username: savedProxy.username,
      password: savedProxy.password,
    });
  }

  const fingerprintScript = `
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
    const origGetParam = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(p) {
      if (p === 37445) return '${fp.webglVendor}';
      if (p === 37446) return '${fp.webglRenderer}';
      return origGetParam.apply(this, arguments);
    };
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => ${fp.cpuCores} });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => ${fp.deviceMemory} });
    Object.defineProperty(navigator, 'platform', { get: () => '${fp.platform}' });
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
    puppeteerBrowser = null;
    runningProfileId = null;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('browser-closed');
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
  return listProfiles();
});

ipcMain.handle('profiles:add', async (event, { name, email, linkedinUrl }) => {
  const profileId = email.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  const proxy = getNextProxy();
  getProfileDir(profileId, proxy);
  saveProfileMeta(profileId, { name, email, linkedinUrl, status: 'ready' });
  return { success: true, profileId };
});

ipcMain.handle('profiles:delete', async (event, { profileId }) => {
  if (runningProfileId === profileId) {
    if (puppeteerBrowser) {
      try { await puppeteerBrowser.close(); } catch {}
      puppeteerBrowser = null;
      runningProfileId = null;
    }
  }
  deleteProfile(profileId);
  return { success: true };
});

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
  if (puppeteerBrowser) {
    try { await puppeteerBrowser.close(); } catch {}
    puppeteerBrowser = null;
    runningProfileId = null;
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

app.whenReady().then(createMainWindow);

app.on('window-all-closed', () => {
  if (puppeteerBrowser) {
    try { puppeteerBrowser.close(); } catch {}
  }
  app.quit();
});
