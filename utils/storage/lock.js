Object.assign(Storage, {
  async getLockInfo() {
    try { return await window.electronAPI.lockGetInfo(); }
    catch (e) { console.error('getLockInfo error:', e); return null; }
  },

  async forceRemoveLock() {
    try { return await window.electronAPI.lockForceRemove(); }
    catch (e) { console.error('forceRemoveLock error:', e); return false; }
  }
});
