Object.assign(Storage, {
  async getClientes() { return await this.getAll('clientes'); },

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

  async deleteCliente(id) { return await this.delete('clientes', id); }
});
