Object.assign(Storage, {
  async getLicencias() { return await this.getAll('licencias'); },

  async addLicencia(licencia) {
    licencia.id = generateId();
    return await this.insert('licencias', licencia);
  },

  async updateLicencia(id, updates) {
    return await this.update('licencias', id, updates);
  },

  async deleteLicencia(id) { return await this.delete('licencias', id); }
});
