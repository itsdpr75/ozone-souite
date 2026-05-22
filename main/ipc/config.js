const { ipcMain } = require('electron');

function registerConfigHandlers(db, setupPeriodicBackup) {
  ipcMain.handle('config-get-all', () => {
    try { return db.getAllConfig(); } catch (e) { console.error('config-get-all:', e.message); return {}; }
  });

  ipcMain.handle('config-get', (_, key) => {
    try { return db.getConfig(key); } catch (e) { console.error('config-get:', e.message); return null; }
  });

  ipcMain.handle('config-set', (_, key, value) => {
    try {
      db.setConfig(key, value);
      if (key === 'backup_periodic' || key === 'backup_interval') {
        setupPeriodicBackup(db.getAllConfig());
      }
      return true;
    } catch (e) { console.error('config-set:', e.message); return false; }
  });
}

module.exports = { registerConfigHandlers };
