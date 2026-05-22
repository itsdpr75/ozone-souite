const { ipcMain } = require('electron');

function registerDbHandlers(db) {
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
}

module.exports = { registerDbHandlers };
