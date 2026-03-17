const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ambassador', {
  // Auth
  checkAuth: () => ipcRenderer.invoke('auth:check'),
  login: (email, password) => ipcRenderer.invoke('auth:login', { email, password }),
  register: (email, password, fullName) => ipcRenderer.invoke('auth:register', { email, password, fullName }),
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
