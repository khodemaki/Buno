const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('receiptApi', {
  onData: (callback) => ipcRenderer.on('receipt-data', (event, data) => callback(data)),
  notifyContentReady: () => ipcRenderer.send('content-ready')
});