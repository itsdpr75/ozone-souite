Object.assign(Storage, {
  async getGastos() { return await this.getAll('gastos'); },

  async addGasto(gasto) {
    gasto.id = generateId();
    return await this.insert('gastos', gasto);
  },

  async deleteGasto(id) { return await this.delete('gastos', id); }
});
