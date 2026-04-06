
const { contextBridge, ipcRenderer } = require('electron');

ipcRenderer.on('updater:status', (_event, payload) => {
  window.dispatchEvent(new CustomEvent('updater-status', { detail: payload }));
});

contextBridge.exposeInMainWorld('electronAPI', {
  // Legacy methods (save/load removed as persistence is now automatic)
  printOrPdf: () => ipcRenderer.invoke('print-or-pdf'),
  updater: {
    getStatus: () => ipcRenderer.invoke('updater:get-status'),
    checkForUpdates: () => ipcRenderer.invoke('updater:check'),
    downloadUpdate: () => ipcRenderer.invoke('updater:download'),
    quitAndInstall: () => ipcRenderer.invoke('updater:quit-and-install')
  },

  // Enterprise Database Bridge (Async/RPC)
  db: {
    query: (sql, params) => ipcRenderer.invoke('db-query', sql, params),
    run: (sql, params) => ipcRenderer.invoke('db-run', sql, params),
    exec: (sql) => ipcRenderer.invoke('db-exec', sql),
    backup: () => ipcRenderer.invoke('db-backup'),
    backupCustom: (path) => ipcRenderer.invoke('db-backup-custom', path),
    selectBackupFolder: () => ipcRenderer.invoke('select-backup-folder'),
    optimizeDatabase: () => ipcRenderer.invoke('db-optimize'),
    selectExternalDrive: () => ipcRenderer.invoke('select-external-drive'),
    initDatabase: (config) => ipcRenderer.invoke('init-database', config),
    updateBatteryDetails: (currentId, newId, dealerId, model) => ipcRenderer.invoke('db-update-battery-details', currentId, newId, dealerId, model),
    selectRestoreFile: () => ipcRenderer.invoke('select-restore-file'),
    restoreDatabase: (path) => ipcRenderer.invoke('db-restore', path)
  }
});
