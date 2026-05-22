// ============================================================
// utils/storage.js - Capa de persistencia via SQLite
// ============================================================

const Storage = {
  async getAll(table) {
    try {
      return await window.electronAPI.dbGetAll(table) || [];
    } catch (e) {
      console.error(`Storage.getAll(${table}) error:`, e);
      return [];
    }
  },

  async getById(table, id) {
    try {
      return await window.electronAPI.dbGetById(table, id) || null;
    } catch (e) {
      console.error(`Storage.getById(${table}, ${id}) error:`, e);
      return null;
    }
  },

  async insert(table, data) {
    try {
      return await window.electronAPI.dbInsert(table, data);
    } catch (e) {
      console.error(`Storage.insert(${table}) error:`, e);
      throw e;
    }
  },

  async update(table, id, data) {
    try {
      return await window.electronAPI.dbUpdate(table, id, data);
    } catch (e) {
      console.error(`Storage.update(${table}, ${id}) error:`, e);
      throw e;
    }
  },

  async delete(table, id) {
    try {
      return await window.electronAPI.dbDelete(table, id);
    } catch (e) {
      console.error(`Storage.delete(${table}, ${id}) error:`, e);
      throw e;
    }
  },

  async getConfigAll() {
    try {
      return await window.electronAPI.configGetAll() || {};
    } catch (e) {
      console.error('Storage.getConfigAll error:', e);
      return {};
    }
  },

  async getConfig(key) {
    try {
      return await window.electronAPI.configGet(key);
    } catch (e) {
      console.error(`Storage.getConfig(${key}) error:`, e);
      return null;
    }
  },

  async setConfig(key, value) {
    try {
      return await window.electronAPI.configSet(key, value);
    } catch (e) {
      console.error(`Storage.setConfig(${key}) error:`, e);
      return false;
    }
  },

  async getClientes() {
    return await this.getAll('clientes');
  },

  async addCliente(cliente) {
    cliente.id = generateId();
    cliente.orders = JSON.stringify(cliente.orders || []);
    cliente.documents = JSON.stringify(cliente.documents || []);
    return await this.insert('clientes', cliente);
  },

  async updateCliente(id, updates) {
    if (updates.orders) updates.orders = JSON.stringify(updates.orders);
    if (updates.documents) updates.documents = JSON.stringify(updates.documents);
    return await this.update('clientes', id, updates);
  },

  async deleteCliente(id) {
    return await this.delete('clientes', id);
  },

  async getFacturas() {
    return await this.getAll('facturas');
  },

  async addFactura(factura) {
    factura.id = generateId();
    factura.lineas = JSON.stringify(factura.lineas || []);

    const facturas = await this.getFacturas();
    const numbers = facturas.map(f => f.numero);
    factura.numero = generateInvoiceNumber(numbers);

    return await this.insert('facturas', factura);
  },

  async updateFactura(id, updates) {
    if (updates.lineas) updates.lineas = JSON.stringify(updates.lineas);
    return await this.update('facturas', id, updates);
  },

  async deleteFactura(id) {
    return await this.delete('facturas', id);
  },

  async getGastos() {
    return await this.getAll('gastos');
  },

  async addGasto(gasto) {
    gasto.id = generateId();
    return await this.insert('gastos', gasto);
  },

  async deleteGasto(id) {
    return await this.delete('gastos', id);
  },

  async getInventarioFisico() {
    return await this.getAll('inventario_fisico');
  },

  async addInventarioFisico(item) {
    item.id = generateId();
    item.prestamos = JSON.stringify(item.prestamos || []);
    return await this.insert('inventario_fisico', item);
  },

  async updateInventarioFisico(id, updates) {
    if (updates.prestamos) updates.prestamos = JSON.stringify(updates.prestamos);
    return await this.update('inventario_fisico', id, updates);
  },

  async deleteInventarioFisico(id) {
    return await this.delete('inventario_fisico', id);
  },

  async getInventarioDigital() {
    return await this.getAll('inventario_digital');
  },

  async addInventarioDigital(item) {
    item.id = generateId();
    return await this.insert('inventario_digital', item);
  },

  async updateInventarioDigital(id, updates) {
    return await this.update('inventario_digital', id, updates);
  },

  async deleteInventarioDigital(id) {
    return await this.delete('inventario_digital', id);
  },

  async getBackupHistory() {
    try {
      return await window.electronAPI.backupGetHistory() || [];
    } catch (e) {
      console.error('getBackupHistory error:', e);
      return [];
    }
  },

  async createZipBackup() {
    try {
      return await window.electronAPI.backupCreateZip();
    } catch (e) {
      console.error('createZipBackup error:', e);
      return null;
    }
  },

  async importZipBackup(zipPath) {
    try {
      return await window.electronAPI.backupImportZip(zipPath);
    } catch (e) {
      console.error('importZipBackup error:', e);
      return { success: false };
    }
  },

  async exportCSV() {
    try {
      return await window.electronAPI.backupExportCSV();
    } catch (e) {
      console.error('exportCSV error:', e);
      return null;
    }
  },

  async importCSV(csvPath) {
    try {
      return await window.electronAPI.backupImportCSV(csvPath);
    } catch (e) {
      console.error('importCSV error:', e);
      return { imported: 0 };
    }
  },

  async deleteBackup(id) {
    try {
      return await window.electronAPI.backupDelete(id);
    } catch (e) {
      console.error('deleteBackup error:', e);
      return false;
    }
  },

  async uploadLogo() {
    try {
      return await window.electronAPI.logoUpload();
    } catch (e) {
      console.error('uploadLogo error:', e);
      return null;
    }
  },

  async getLogoPath() {
    try {
      return await window.electronAPI.logoGetPath() || '';
    } catch (e) {
      console.error('getLogoPath error:', e);
      return '';
    }
  },

  async clearLogo() {
    try {
      return await window.electronAPI.logoClear();
    } catch (e) {
      console.error('clearLogo error:', e);
      return false;
    }
  },

  async readLogo(logoPath) {
    try {
      return await window.electronAPI.logoRead(logoPath);
    } catch (e) {
      console.error('readLogo error:', e);
      return null;
    }
  },

  async getDbPath() {
    try {
      return await window.electronAPI.dbGetPath();
    } catch (e) {
      console.error('getDbPath error:', e);
      return '';
    }
  },

  async migrateDb(newPath, moveData) {
    try {
      return await window.electronAPI.dbMigrate(newPath, moveData);
    } catch (e) {
      console.error('migrateDb error:', e);
      return { success: false };
    }
  },

  async getDefaultDir() {
    try {
      return await window.electronAPI.dbGetDefaultDir();
    } catch (e) {
      console.error('getDefaultDir error:', e);
      return '';
    }
  },

  async getLocationHistory() {
    try {
      return await window.electronAPI.dbGetLocationHistory() || [];
    } catch (e) {
      console.error('getLocationHistory error:', e);
      return [];
    }
  },

  async getLockInfo() {
    try {
      return await window.electronAPI.lockGetInfo();
    } catch (e) {
      console.error('getLockInfo error:', e);
      return null;
    }
  },

  async forceRemoveLock() {
    try {
      return await window.electronAPI.lockForceRemove();
    } catch (e) {
      console.error('forceRemoveLock error:', e);
      return false;
    }
  }
};
