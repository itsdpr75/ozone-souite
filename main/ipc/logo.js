const { ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');

function registerLogoHandlers(db) {
  ipcMain.handle('logo-upload', async (_, mainWindow) => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'] }]
      });
      if (result.canceled || result.filePaths.length === 0) return null;
      const srcPath = result.filePaths[0];
      const configDir = db.getDefaultDir();
      const destPath = path.join(configDir, 'logo' + path.extname(srcPath));
      fs.copyFileSync(srcPath, destPath);
      db.setConfig('logo_path', destPath);
      return { path: destPath };
    } catch (e) { console.error('logo-upload:', e.message); return null; }
  });

  ipcMain.handle('logo-get-path', () => {
    try { return db.getConfig('logo_path') || ''; } catch (e) { console.error('logo-get-path:', e.message); return ''; }
  });

  ipcMain.handle('logo-clear', () => {
    try {
      const logoPath = db.getConfig('logo_path');
      if (logoPath && fs.existsSync(logoPath)) fs.unlinkSync(logoPath);
      db.setConfig('logo_path', '');
      return true;
    } catch (e) { console.error('logo-clear:', e.message); return false; }
  });

  ipcMain.handle('logo-read', async (_, logoPath) => {
    try {
      if (!logoPath || !fs.existsSync(logoPath)) return null;
      const data = fs.readFileSync(logoPath);
      return `data:image/png;base64,${data.toString('base64')}`;
    } catch (e) { console.error('logo-read:', e.message); return null; }
  });
}

module.exports = { registerLogoHandlers };
