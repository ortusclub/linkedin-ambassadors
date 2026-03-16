const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ambassador', {
  launchBrowser: (profileId, proxy) => ipcRenderer.invoke('launch-browser', { profileId, proxy }),
  closeBrowser: () => ipcRenderer.invoke('close-browser'),
  getStatus: () => ipcRenderer.invoke('get-status'),
  onBrowserClosed: (callback) => ipcRenderer.on('browser-closed', callback),
});
