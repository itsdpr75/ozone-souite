const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Ozone platform se configura via ELECTRON_OZONE_PLATFORM=x11 en package.json

const db = require('./database');
const lock = require('./utils/lock');
const backup = require('./utils/backup');

let mainWindow;
let backupInterval = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 1024,
    minHeight: 600,
    resizable: true,
    title: 'Ozone Souite',
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: true
    }
  });

  mainWindow.loadFile('index.html');
  // mainWindow.webContents.openDevTools({ mode: 'detach' });

  mainWindow.webContents.on('console-message', (event) => {
    console.log(`[Renderer] ${event.sourceId}:${event.lineNumber} - ${event.message}`);
  });

  mainWindow.webContents.on('did-fail-load', (event, code, desc) => {
    console.error('Failed to load:', code, desc);
  });

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('Renderer crashed:', details);
  });
}

// Inicializacion
app.whenReady().then(async () => {
  // Inicializar base de datos primero
  await db.initDatabase();
  const config = db.getAllConfig();
  const dbPath = config.db_path || db.getDbPath();

  // Si la ruta configurada es diferente, migrar
  if (dbPath !== db.getDbPath()) {
    db.closeDatabase();
    await db.initDatabase(dbPath);
  }

  // Verificar lock
  const lockInfo = lock.getLockInfo();
  if (lockInfo) {
    createWindow();
    mainWindow.webContents.on('did-finish-load', () => {
      mainWindow.webContents.send('lock-warning', lockInfo);
    });
  } else {
    lock.createLock();
    createWindow();
  }

  // Backup al abrir si esta configurado
  if (config.backup_on_open === 'true') {
    backup.runAutoBackup('open');
  }

  // Configurar backup periodico
  setupPeriodicBackup(config);
});

function setupPeriodicBackup(config) {
  if (backupInterval) clearInterval(backupInterval);
  if (config.backup_periodic === 'true') {
    const hours = parseInt(config.backup_interval) || 24;
    backupInterval = setInterval(() => {
      backup.runAutoBackup('periodic');
    }, hours * 60 * 60 * 1000);
  }
}

app.on('window-all-closed', async () => {
  // Backup al cerrar si esta configurado
  const config = db.getAllConfig();
  if (config.backup_on_close === 'true') {
    await backup.runAutoBackup('close');
  }

  // Eliminar lock
  lock.removeLock();

  // Cerrar base de datos
  db.closeDatabase();

  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ============================================================
// IPC Handlers - Datos (SQLite)
// ============================================================

ipcMain.handle('db-get-all', (_, table) => {
  try { return db.getAll(table); } catch (e) { console.error('db-get-all:', e.message); return []; }
});

ipcMain.handle('db-get-by-id', (_, table, id) => {
  try { return db.getById(table, id); } catch (e) { console.error('db-get-by-id:', e.message); return null; }
});

ipcMain.handle('db-insert', (_, table, data) => {
  try { return db.insert(table, data); } catch (e) { console.error('db-insert:', e.message); throw e; }
});

ipcMain.handle('db-update', (_, table, id, data) => {
  try { return db.update(table, id, data); } catch (e) { console.error('db-update:', e.message); throw e; }
});

ipcMain.handle('db-delete', (_, table, id) => {
  try { return db.del(table, id); } catch (e) { console.error('db-delete:', e.message); throw e; }
});

// ============================================================
// IPC Handlers - Config
// ============================================================

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

// ============================================================
// IPC Handlers - Database path
// ============================================================

ipcMain.handle('db-get-path', () => {
  try { return db.getDbPath(); } catch (e) { console.error('db-get-path:', e.message); return ''; }
});

ipcMain.handle('db-migrate', async (_, newPath, moveData) => {
  try {
    if (moveData) {
      return await db.migrateDatabase(newPath);
    } else {
      db.closeDatabase();
      await db.initDatabase(newPath);
      db.setConfig('db_path', newPath);
      return { success: true, moved: false };
    }
  } catch (e) { console.error('db-migrate:', e.message); return { success: false }; }
});

ipcMain.handle('db-get-default-dir', () => {
  try { return db.getDefaultDir(); } catch (e) { console.error('db-get-default-dir:', e.message); return ''; }
});

ipcMain.handle('db-get-location-history', () => {
  try {
    const stmt = db.getDb().prepare('SELECT * FROM location_history ORDER BY fecha DESC');
    const rows = [];
    while (stmt.step()) { rows.push(stmt.getAsObject()); }
    stmt.free();
    return rows;
  } catch (e) { console.error('db-get-location-history:', e.message); return []; }
});

// ============================================================
// IPC Handlers - Dialogs
// ============================================================

ipcMain.handle('dialog-open-file', async (_, filters) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: filters || [{ name: 'All Files', extensions: ['*'] }]
  });
  return result;
});

ipcMain.handle('dialog-open-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  return result;
});

ipcMain.handle('dialog-save-file', async (_, defaultPath, filters) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath,
    filters: filters || [{ name: 'All Files', extensions: ['*'] }]
  });
  return result;
});

// ============================================================
// IPC Handlers - Backups
// ============================================================

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

ipcMain.handle('dialog-open-backup', async () => {
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

// ============================================================
// IPC Handlers - Lock
// ============================================================

ipcMain.handle('lock-get-info', () => {
  try { return lock.getLockInfo(); } catch (e) { console.error('lock-get-info:', e.message); return null; }
});

ipcMain.handle('lock-force-remove', () => {
  try { lock.removeLock(); return true; } catch (e) { console.error('lock-force-remove:', e.message); return false; }
});

ipcMain.handle('lock-create', () => {
  try { lock.createLock(); return true; } catch (e) { console.error('lock-create:', e.message); return false; }
});

// ============================================================
// IPC Handlers - Logo
// ============================================================

ipcMain.handle('logo-upload', async () => {
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
