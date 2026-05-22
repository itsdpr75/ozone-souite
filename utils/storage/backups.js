Object.assign(Storage, {
  async getBackupHistory() {
    try { return await window.electronAPI.backupGetHistory() || []; }
    catch (e) { console.error('getBackupHistory error:', e); return []; }
  },

  async createZipBackup() {
    try { return await window.electronAPI.backupCreateZip(); }
    catch (e) { console.error('createZipBackup error:', e); return null; }
  },

  async importZipBackup(zipPath) {
    try { return await window.electronAPI.backupImportZip(zipPath); }
    catch (e) { console.error('importZipBackup error:', e); return { success: false }; }
  },

  async exportCSV() {
    try { return await window.electronAPI.backupExportCSV(); }
    catch (e) { console.error('exportCSV error:', e); return null; }
  },

  async importCSV(csvPath) {
    try { return await window.electronAPI.backupImportCSV(csvPath); }
    catch (e) { console.error('importCSV error:', e); return { imported: 0 }; }
  },

  async deleteBackup(id) {
    try { return await window.electronAPI.backupDelete(id); }
    catch (e) { console.error('deleteBackup error:', e); return false; }
  }
});
