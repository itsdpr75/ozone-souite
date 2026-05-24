const { ipcMain, dialog } = require('electron');

function registerBackupHandlers(backup) {
  ipcMain.handle('backup-create-zip', async () => {
    try { return await backup.createZipBackup(); } catch (e) { console.error('backup-create-zip:', e.message); return null; }
  });

  ipcMain.handle('backup-import-zip', async (_, zipPath) => {
    try { return await backup.importZipBackup(zipPath); } catch (e) { console.error('backup-import-zip:', e.message); return { success: false }; }
  });

  ipcMain.handle('backup-export-csv', async () => {
    try { return await backup.exportToCSV(); } catch (e) { console.error('backup-export-csv:', e.message); return null; }
  });

  ipcMain.handle('backup-import-csv', async (_, csvPath) => {
    try { return await backup.importFromCSV(csvPath); } catch (e) { console.error('backup-import-csv:', e.message); return { imported: 0 }; }
  });

  ipcMain.handle('backup-get-history', () => {
    try { return backup.getBackupHistory(); } catch (e) { console.error('backup-get-history:', e.message); return []; }
  });

  ipcMain.handle('backup-delete', (_, id) => {
    try { backup.deleteBackup(id); return true; } catch (e) { console.error('backup-delete:', e.message); return false; }
  });

  ipcMain.handle('dialog-open-backup', async (_, mainWindow) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'ZIP Files', extensions: ['zip'] },
        { name: 'CSV Files', extensions: ['csv'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    return result;
  });
}

module.exports = { registerBackupHandlers };
