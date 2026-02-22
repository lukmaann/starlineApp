
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Legacy methods (save/load removed as persistence is now automatic)
  printOrPdf: () => ipcRenderer.invoke('print-or-pdf'),

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
