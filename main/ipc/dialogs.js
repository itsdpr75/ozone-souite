const { ipcMain, dialog } = require('electron');

function registerDialogHandlers(mainWindow) {
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
}

module.exports = { registerDialogHandlers };
