const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  dbGetAll: (table) => ipcRenderer.invoke('db-get-all', table),
  dbGetById: (table, id) => ipcRenderer.invoke('db-get-by-id', table, id),
  dbInsert: (table, data) => ipcRenderer.invoke('db-insert', table, data),
  dbUpdate: (table, id, data) => ipcRenderer.invoke('db-update', table, id, data),
  dbDelete: (table, id) => ipcRenderer.invoke('db-delete', table, id),

  configGetAll: () => ipcRenderer.invoke('config-get-all'),
  configGet: (key) => ipcRenderer.invoke('config-get', key),
  configSet: (key, value) => ipcRenderer.invoke('config-set', key, value),

  dbGetPath: () => ipcRenderer.invoke('db-get-path'),
  dbMigrate: (newPath, moveData) => ipcRenderer.invoke('db-migrate', newPath, moveData),
  dbGetDefaultDir: () => ipcRenderer.invoke('db-get-default-dir'),
  dbGetLocationHistory: () => ipcRenderer.invoke('db-get-location-history'),

  openFile: (filters) => ipcRenderer.invoke('dialog-open-file', filters),
  openDirectory: () => ipcRenderer.invoke('dialog-open-directory'),
  saveFile: (defaultPath, filters) => ipcRenderer.invoke('dialog-save-file', defaultPath, filters),

  backupCreateZip: () => ipcRenderer.invoke('backup-create-zip'),
  backupImportZip: (zipPath) => ipcRenderer.invoke('backup-import-zip', zipPath),
  backupExportCSV: () => ipcRenderer.invoke('backup-export-csv'),
  backupImportCSV: (csvPath) => ipcRenderer.invoke('backup-import-csv', csvPath),
  backupGetHistory: () => ipcRenderer.invoke('backup-get-history'),
  backupDelete: (id) => ipcRenderer.invoke('backup-delete', id),
  openBackupFile: () => ipcRenderer.invoke('dialog-open-backup'),

  lockGetInfo: () => ipcRenderer.invoke('lock-get-info'),
  lockForceRemove: () => ipcRenderer.invoke('lock-force-remove'),
  lockCreate: () => ipcRenderer.invoke('lock-create'),

  logoUpload: () => ipcRenderer.invoke('logo-upload'),
  logoGetPath: () => ipcRenderer.invoke('logo-get-path'),
  logoClear: () => ipcRenderer.invoke('logo-clear'),
  logoRead: (logoPath) => ipcRenderer.invoke('logo-read', logoPath),

  onLockWarning: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('lock-warning', handler);
    return () => ipcRenderer.removeListener('lock-warning', handler);
  }
});
