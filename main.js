const { app, BrowserWindow } = require('electron');
const path = require('path');

const db = require('./database');
const lock = require('./utils/lock');
const backup = require('./utils/backup');
const { registerDbHandlers } = require('./main/ipc/db');
const { registerConfigHandlers } = require('./main/ipc/config');
const { registerBackupHandlers } = require('./main/ipc/backup');
const { registerLockHandlers } = require('./main/ipc/lock');
const { registerLogoHandlers } = require('./main/ipc/logo');
const { registerDialogHandlers } = require('./main/ipc/dialogs');

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

function setupPeriodicBackup(config) {
  if (backupInterval) clearInterval(backupInterval);
  if (config.backup_periodic === 'true') {
    const hours = parseInt(config.backup_interval) || 24;
    backupInterval = setInterval(() => {
      backup.runAutoBackup('periodic');
    }, hours * 60 * 60 * 1000);
  }
}

function registerIpcHandlers() {
  registerDbHandlers(db);
  registerConfigHandlers(db, setupPeriodicBackup);
  registerBackupHandlers(backup);
  registerLockHandlers(lock);
  registerLogoHandlers(db);
  registerDialogHandlers(mainWindow);
}

app.whenReady().then(async () => {
  await db.initDatabase();
  const config = db.getAllConfig();
  const dbPath = config.db_path || db.getDbPath();

  if (dbPath !== db.getDbPath()) {
    db.closeDatabase();
    await db.initDatabase(dbPath);
  }

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

  registerIpcHandlers();

  if (config.backup_on_open === 'true') {
    backup.runAutoBackup('open');
  }

  setupPeriodicBackup(config);
});

app.on('window-all-closed', async () => {
  const config = db.getAllConfig();
  if (config.backup_on_close === 'true') {
    await backup.runAutoBackup('close');
  }

  lock.removeLock();
  db.closeDatabase();

  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
