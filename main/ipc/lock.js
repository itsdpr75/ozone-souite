const { ipcMain } = require('electron');

function registerLockHandlers(lock) {
  ipcMain.handle('lock-get-info', () => {
    try { return lock.getLockInfo(); } catch (e) { console.error('lock-get-info:', e.message); return null; }
  });

  ipcMain.handle('lock-force-remove', () => {
    try { lock.removeLock(); return true; } catch (e) { console.error('lock-force-remove:', e.message); return false; }
  });

  ipcMain.handle('lock-create', () => {
    try { lock.createLock(); return true; } catch (e) { console.error('lock-create:', e.message); return false; }
  });
}

module.exports = { registerLockHandlers };
