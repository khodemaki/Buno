const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('splashApi', {
  onImages: (callback) => ipcRenderer.on('splash-images', (event, data) => callback(data))
});
