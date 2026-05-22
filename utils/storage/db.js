Object.assign(Storage, {
  async getDbPath() {
    try { return await window.electronAPI.dbGetPath(); }
    catch (e) { console.error('getDbPath error:', e); return ''; }
  },

  async migrateDb(newPath, moveData) {
    try { return await window.electronAPI.dbMigrate(newPath, moveData); }
    catch (e) { console.error('migrateDb error:', e); return { success: false }; }
  },

  async getDefaultDir() {
    try { return await window.electronAPI.dbGetDefaultDir(); }
    catch (e) { console.error('getDefaultDir error:', e); return ''; }
  },

  async getLocationHistory() {
    try { return await window.electronAPI.dbGetLocationHistory() || []; }
    catch (e) { console.error('getLocationHistory error:', e); return []; }
  }
});
