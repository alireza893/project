const { contextBridge, ipcRenderer } = require('electron')

// Only these few functions are exposed to the renderer (contextIsolation is enabled)
contextBridge.exposeInMainWorld('api', {
  login: (u, p) => ipcRenderer.invoke('auth:login', u, p),
  readDb: () => ipcRenderer.invoke('db:read'),
  writeDb: (db) => ipcRenderer.invoke('db:write', db),
  openExcel: () => ipcRenderer.invoke('dialog:openExcel'),
  openLogo: () => ipcRenderer.invoke('dialog:openLogo'),
  loadLogo: (p) => ipcRenderer.invoke('logo:load', p),
  exportPdf: (name) => ipcRenderer.invoke('invoice:exportPdf', name),
  showItem: (p) => ipcRenderer.invoke('shell:showItem', p),
  exportBackup: () => ipcRenderer.invoke('backup:export'),
  importBackup: () => ipcRenderer.invoke('backup:import'),
  platform: process.platform,
})
