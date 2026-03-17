const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ambassador', {
  // Auth
  checkAuth: () => ipcRenderer.invoke('auth:check'),
  sendVerification: (email) => ipcRenderer.invoke('auth:send-verification', { email }),
  verifyCode: (email, code) => ipcRenderer.invoke('auth:verify-code', { email, code }),
  logout: () => ipcRenderer.invoke('auth:logout'),

  // Profiles
  listProfiles: () => ipcRenderer.invoke('profiles:list'),
  addProfile: (name, email, linkedinUrl) => ipcRenderer.invoke('profiles:add', { name, email, linkedinUrl }),
  deleteProfile: (profileId) => ipcRenderer.invoke('profiles:delete', { profileId }),

  // Browser
  runBrowser: (profileId) => ipcRenderer.invoke('browser:run', { profileId }),
  stopBrowser: () => ipcRenderer.invoke('browser:stop'),
  getBrowserStatus: () => ipcRenderer.invoke('browser:status'),
  onBrowserClosed: (callback) => ipcRenderer.on('browser-closed', callback),

  // Legacy
  closeBrowserAndRegister: (data) => ipcRenderer.invoke('close-browser-and-register', data),
});
