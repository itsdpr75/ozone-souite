Object.assign(Storage, {
  async getInventarioFisico() { return await this.getAll('inventario_fisico'); },

  async addInventarioFisico(item) {
    item.id = generateId();
    item.prestamos = JSON.stringify(item.prestamos || []);
    return await this.insert('inventario_fisico', item);
  },

  async updateInventarioFisico(id, updates) {
    if (updates.prestamos) updates.prestamos = JSON.stringify(updates.prestamos);
    return await this.update('inventario_fisico', id, updates);
  },

  async deleteInventarioFisico(id) { return await this.delete('inventario_fisico', id); },

  async getInventarioDigital() { return await this.getAll('inventario_digital'); },

  async addInventarioDigital(item) {
    item.id = generateId();
    return await this.insert('inventario_digital', item);
  },

  async updateInventarioDigital(id, updates) {
    return await this.update('inventario_digital', id, updates);
  },

  async deleteInventarioDigital(id) { return await this.delete('inventario_digital', id); }
});
