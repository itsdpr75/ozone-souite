Object.assign(Storage, {
  async uploadLogo() {
    try { return await window.electronAPI.logoUpload(); }
    catch (e) { console.error('uploadLogo error:', e); return null; }
  },

  async getLogoPath() {
    try { return await window.electronAPI.logoGetPath() || ''; }
    catch (e) { console.error('getLogoPath error:', e); return ''; }
  },

  async clearLogo() {
    try { return await window.electronAPI.logoClear(); }
    catch (e) { console.error('clearLogo error:', e); return false; }
  },

  async readLogo(logoPath) {
    try { return await window.electronAPI.logoRead(logoPath); }
    catch (e) { console.error('readLogo error:', e); return null; }
  }
});
