const Storage = {
  async getAll(table) {
    try { return await window.electronAPI.dbGetAll(table) || []; }
    catch (e) { console.error(`Storage.getAll(${table}) error:`, e); return []; }
  },

  async getById(table, id) {
    try { return await window.electronAPI.dbGetById(table, id) || null; }
    catch (e) { console.error(`Storage.getById(${table}, ${id}) error:`, e); return null; }
  },

  async insert(table, data) {
    try { return await window.electronAPI.dbInsert(table, data); }
    catch (e) { console.error(`Storage.insert(${table}) error:`, e); throw e; }
  },

  async update(table, id, data) {
    try { return await window.electronAPI.dbUpdate(table, id, data); }
    catch (e) { console.error(`Storage.update(${table}, ${id}) error:`, e); throw e; }
  },

  async delete(table, id) {
    try { return await window.electronAPI.dbDelete(table, id); }
    catch (e) { console.error(`Storage.delete(${table}, ${id}) error:`, e); throw e; }
  },

  async getConfigAll() {
    try { return await window.electronAPI.configGetAll() || {}; }
    catch (e) { console.error('Storage.getConfigAll error:', e); return {}; }
  },

  async getConfig(key) {
    try { return await window.electronAPI.configGet(key); }
    catch (e) { console.error(`Storage.getConfig(${key}) error:`, e); return null; }
  },

  async setConfig(key, value) {
    try { return await window.electronAPI.configSet(key, value); }
    catch (e) { console.error(`Storage.setConfig(${key}) error:`, e); return false; }
  }
};
