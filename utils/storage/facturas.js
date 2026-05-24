Object.assign(Storage, {
  async getFacturas() { return await this.getAll('facturas'); },

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

  async deleteFactura(id) { return await this.delete('facturas', id); }
});
