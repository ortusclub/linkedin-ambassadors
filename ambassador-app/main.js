const { app, BrowserWindow, session, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Store profile data in user's app data directory
const PROFILES_DIR = path.join(app.getPath('userData'), 'profiles');

let mainWindow = null;
let browserWindow = null;
let currentProfileId = null;

// Generate consistent fingerprint from profile ID
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

function getProfileDir(profileId) {
  const dir = path.join(PROFILES_DIR, profileId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const configPath = path.join(dir, 'fingerprint.json');
  let config;
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } else {
    config = generateFingerprint(profileId);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  }
  return { dir, config };
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 500,
    height: 650,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#f9fafb',
  });

  mainWindow.loadFile('index.html');
}

function openBrowser(profileId, proxyConfig) {
  currentProfileId = profileId;
  const { dir, config } = getProfileDir(profileId);
  const partitionName = `persist:profile-${profileId}`;

  browserWindow = new BrowserWindow({
    width: config.screenWidth,
    height: config.screenHeight,
    webPreferences: {
      partition: partitionName,
      preload: path.join(__dirname, 'fingerprint.js'),
      contextIsolation: true,
    },
    title: `LinkedIn Ambassadors — ${profileId}`,
  });

  // Set user agent
  browserWindow.webContents.setUserAgent(config.userAgent);

  // Set up proxy if provided
  if (proxyConfig && proxyConfig.host) {
    const proxyUrl = `http://${proxyConfig.host}:${proxyConfig.port || 80}`;
    browserWindow.webContents.session.setProxy({ proxyRules: proxyUrl });

    // Handle proxy auth
    if (proxyConfig.username && proxyConfig.password) {
      browserWindow.webContents.on('login', (event, details, authInfo, callback) => {
        event.preventDefault();
        callback(proxyConfig.username, proxyConfig.password);
      });
    }
  }

  // Inject fingerprint spoofing on every page load
  browserWindow.webContents.on('did-finish-load', () => {
    browserWindow.webContents.executeJavaScript(`
      // Canvas fingerprint
      const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function(type) {
        const ctx = this.getContext('2d');
        if (ctx) {
          try {
            const imageData = ctx.getImageData(0, 0, this.width, this.height);
            for (let i = 0; i < imageData.data.length; i += 4) {
              imageData.data[i] ^= ${config.canvasNoise};
            }
            ctx.putImageData(imageData, 0, 0);
          } catch {}
        }
        return origToDataURL.apply(this, arguments);
      };

      // WebGL
      const origGetParam = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(p) {
        if (p === 37445) return '${config.webglVendor}';
        if (p === 37446) return '${config.webglRenderer}';
        return origGetParam.apply(this, arguments);
      };

      // Navigator
      Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => ${config.cpuCores} });
      Object.defineProperty(navigator, 'deviceMemory', { get: () => ${config.deviceMemory} });
      Object.defineProperty(navigator, 'platform', { get: () => '${config.platform}' });

      // WebRTC leak prevention
      if (typeof RTCPeerConnection !== 'undefined') {
        const origRTC = RTCPeerConnection;
        window.RTCPeerConnection = function(...args) {
          if (args[0] && args[0].iceServers) args[0].iceServers = [];
          return new origRTC(...args);
        };
        window.RTCPeerConnection.prototype = origRTC.prototype;
      }
    `).catch(() => {});
  });

  // Navigate to LinkedIn
  browserWindow.loadURL('https://www.linkedin.com/login');

  browserWindow.on('closed', () => {
    browserWindow = null;
    currentProfileId = null;
    // Tell the main window the browser was closed
    if (mainWindow) {
      mainWindow.webContents.send('browser-closed');
    }
  });
}

// IPC handlers
ipcMain.handle('launch-browser', async (event, { profileId, proxy }) => {
  if (browserWindow) {
    browserWindow.focus();
    return { success: true, message: 'Browser is already open' };
  }
  openBrowser(profileId, proxy);
  return { success: true };
});

ipcMain.handle('close-browser', async () => {
  if (browserWindow) {
    browserWindow.close();
  }
  return { success: true };
});

ipcMain.handle('get-status', async () => {
  return {
    browserOpen: !!browserWindow,
    profileId: currentProfileId,
  };
});

app.whenReady().then(createMainWindow);

app.on('window-all-closed', () => {
  app.quit();
});
