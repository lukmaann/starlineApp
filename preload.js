
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Legacy methods (save/load removed as persistence is now automatic)
  printOrPdf: () => ipcRenderer.invoke('print-or-pdf'),

  // Enterprise Database Bridge (Async/RPC)
  db: {
    query: (sql, params) => ipcRenderer.invoke('db-query', sql, params),
    run: (sql, params) => ipcRenderer.invoke('db-run', sql, params),
    exec: (sql) => ipcRenderer.invoke('db-exec', sql)
  },
  backup: () => ipcRenderer.invoke('db-backup'),
  selectBackupFolder: () => ipcRenderer.invoke('select-backup-folder'),
  backupCustom: (path) => ipcRenderer.invoke('db-backup-custom', path),
  selectRestoreFile: () => ipcRenderer.invoke('select-restore-file'),
  restore: (path) => ipcRenderer.invoke('db-restore', path)
});
