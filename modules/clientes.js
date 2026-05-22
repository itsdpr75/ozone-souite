// ============================================================
// modules/clientes.js - Gestion completa de clientes
// ============================================================

const ClientesModule = {
  clientes: [],

  async init() {
    this.clientes = await Storage.getClientes() || [];
    this.renderTable();
    this.bindEvents();
    localStorage.setItem('clientes_cache', JSON.stringify(this.clientes));
  },

  renderTable(filter = '') {
    const tbody = document.querySelector('#clientes-table tbody');
    const filtered = this.clientes.filter(c => {
      if (!filter) return true;
      const f = filter.toLowerCase();
      return c.nombre.toLowerCase().includes(f) || c.nif.toLowerCase().includes(f) || c.email.toLowerCase().includes(f);
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-state"><p>No hay clientes registrados</p><button class="btn btn-primary" onclick="ClientesModule.showCreateForm()"><i class="bi bi-plus"></i> Crear primer cliente</button></td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(c => `
      <tr>
        <td><strong>${escapeHtml(c.nombre)}</strong></td>
        <td>${escapeHtml(c.nif)}</td>
        <td>${escapeHtml(c.email)}</td>
        <td>${escapeHtml(c.telefono || '-')}</td>
        <td>
          <button class="btn-icon" onclick="ClientesModule.showDetail('${c.id}')" title="Ver detalle"><i class="bi bi-eye"></i></button>
          <button class="btn-icon" onclick="ClientesModule.showEditForm('${c.id}')" title="Editar"><i class="bi bi-pencil"></i></button>
          <button class="btn-icon" onclick="ClientesModule.deleteCliente('${c.id}')" title="Eliminar"><i class="bi bi-trash3"></i></button>
        </td>
      </tr>
    `).join('');
  },

  bindEvents() {
    document.getElementById('btn-new-cliente').addEventListener('click', () => this.showCreateForm());
    document.getElementById('cliente-search').addEventListener('input', (e) => this.renderTable(e.target.value));
  },

  showCreateForm() {
    openModal('Nuevo Cliente', `
      <form id="form-cliente" onsubmit="ClientesModule.handleSave(event)">
        <div class="form-group"><label>Nombre / Razon Social *</label><input type="text" name="nombre" class="form-input" required placeholder="Nombre del cliente o empresa"></div>
        <div class="form-row">
          <div class="form-group"><label>NIF/CIF *</label><input type="text" name="nif" class="form-input" required placeholder="12345678A" maxlength="9"></div>
          <div class="form-group"><label>Telefono</label><input type="tel" name="telefono" class="form-input" placeholder="+34 600 000 000"></div>
        </div>
        <div class="form-group"><label>Email *</label><input type="email" name="email" class="form-input" required placeholder="cliente@empresa.com"></div>
        <div class="form-group"><label>Direccion</label><input type="text" name="direccion" class="form-input" placeholder="Calle, Ciudad, CP"></div>
        <div class="form-group"><label>Notas</label><textarea name="notas" class="form-textarea" placeholder="Observaciones sobre el cliente..."></textarea></div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Guardar Cliente</button>
        </div>
      </form>
    `);
  },

  showEditForm(id) {
    const cliente = this.clientes.find(c => c.id === id);
    if (!cliente) return;

    openModal('Editar Cliente', `
      <form id="form-cliente" onsubmit="ClientesModule.handleUpdate(event, '${id}')">
        <div class="form-group"><label>Nombre / Razon Social *</label><input type="text" name="nombre" class="form-input" required value="${escapeHtml(cliente.nombre)}"></div>
        <div class="form-row">
          <div class="form-group"><label>NIF/CIF *</label><input type="text" name="nif" class="form-input" required value="${escapeHtml(cliente.nif)}" maxlength="9"></div>
          <div class="form-group"><label>Telefono</label><input type="tel" name="telefono" class="form-input" value="${escapeHtml(cliente.telefono || '')}"></div>
        </div>
        <div class="form-group"><label>Email *</label><input type="email" name="email" class="form-input" required value="${escapeHtml(cliente.email)}"></div>
        <div class="form-group"><label>Direccion</label><input type="text" name="direccion" class="form-input" value="${escapeHtml(cliente.direccion || '')}"></div>
        <div class="form-group"><label>Notas</label><textarea name="notas" class="form-textarea">${escapeHtml(cliente.notas || '')}</textarea></div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Actualizar Cliente</button>
        </div>
      </form>
    `);
  },

  async handleSave(e) {
    e.preventDefault();
    const form = e.target;
    const cliente = {
      nombre: form.nombre.value.trim(),
      nif: form.nif.value.trim().toUpperCase(),
      email: form.email.value.trim(),
      telefono: form.telefono.value.trim(),
      direccion: form.direccion.value.trim(),
      notas: form.notas.value.trim()
    };

    if (!isNotEmpty(cliente.nombre) || !isNotEmpty(cliente.nif) || !isNotEmpty(cliente.email)) {
      showToast('Por favor, completa los campos obligatorios', 'error');
      return;
    }
    if (!isValidEmail(cliente.email)) {
      showToast('El email no es valido', 'error');
      return;
    }

    await Storage.addCliente(cliente);
    this.clientes = await Storage.getClientes();
    this.renderTable();
    localStorage.setItem('clientes_cache', JSON.stringify(this.clientes));
    closeModal();
    showToast('Cliente creado correctamente', 'success');
  },

  async handleUpdate(e, id) {
    e.preventDefault();
    const form = e.target;
    const updates = {
      nombre: form.nombre.value.trim(),
      nif: form.nif.value.trim().toUpperCase(),
      email: form.email.value.trim(),
      telefono: form.telefono.value.trim(),
      direccion: form.direccion.value.trim(),
      notas: form.notas.value.trim()
    };

    if (!isNotEmpty(updates.nombre) || !isNotEmpty(updates.nif) || !isNotEmpty(updates.email)) {
      showToast('Por favor, completa los campos obligatorios', 'error');
      return;
    }

    await Storage.updateCliente(id, updates);
    this.clientes = await Storage.getClientes();
    this.renderTable();
    localStorage.setItem('clientes_cache', JSON.stringify(this.clientes));
    closeModal();
    showToast('Cliente actualizado correctamente', 'success');
  },

  async deleteCliente(id) {
    const cliente = this.clientes.find(c => c.id === id);
    if (!cliente) return;
    if (!confirmAction(`¿Eliminar al cliente "${cliente.nombre}"? Esta accion no se puede deshacer.`)) return;

    await Storage.deleteCliente(id);
    this.clientes = await Storage.getClientes();
    this.renderTable();
    localStorage.setItem('clientes_cache', JSON.stringify(this.clientes));
    showToast('Cliente eliminado', 'info');
  },

  async showDetail(id) {
    const cliente = this.clientes.find(c => c.id === id);
    if (!cliente) return;

    const facturas = await Storage.getFacturas();
    const facturasCliente = facturas.filter(f => f.cliente_id === id);

    const orders = typeof cliente.orders === 'string' ? JSON.parse(cliente.orders) : (cliente.orders || []);
    const documents = typeof cliente.documents === 'string' ? JSON.parse(cliente.documents) : (cliente.documents || []);

    const ordersHTML = orders.map(o => `
      <tr><td>${formatDate(o.fecha)}</td><td>${escapeHtml(o.tipo)}</td><td>${formatCurrency(o.precio)}</td><td><span class="badge badge-${o.estado}">${escapeHtml(o.estado)}</span></td></tr>
    `).join('') || '<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">Sin pedidos</td></tr>';

    const docsHTML = documents.map(d => `
      <li>${escapeHtml(d.nombre)} <small style="color:var(--text-muted)">(${formatDate(d.fecha)})</small></li>
    `).join('') || '<li style="color:var(--text-muted)">Sin documentos</li>';

    openModal(`Detalle: ${cliente.nombre}`, `
      <div style="margin-bottom:20px">
        <p><strong>Nombre:</strong> ${escapeHtml(cliente.nombre)}</p>
        <p><strong>NIF/CIF:</strong> ${escapeHtml(cliente.nif)}</p>
        <p><strong>Email:</strong> ${escapeHtml(cliente.email)}</p>
        <p><strong>Telefono:</strong> ${escapeHtml(cliente.telefono || '-')}</p>
        <p><strong>Direccion:</strong> ${escapeHtml(cliente.direccion || '-')}</p>
        <p><strong>Notas:</strong> ${escapeHtml(cliente.notas || '-')}</p>
      </div>
      <div class="order-history">
        <h4>Historial de Compras/Pedidos</h4>
        <table class="data-table"><thead><tr><th>Fecha</th><th>Tipo</th><th>Precio</th><th>Estado</th></tr></thead><tbody>${ordersHTML}</tbody></table>
        <button class="btn btn-sm btn-secondary" style="margin-top:12px" onclick="ClientesModule.showAddOrder('${id}')"><i class="bi bi-plus"></i> Añadir Pedido</button>
      </div>
      <div class="order-history">
        <h4>Documentos Adjuntos</h4>
        <ul style="list-style:none;padding:0">${docsHTML}</ul>
        <button class="btn btn-sm btn-secondary" style="margin-top:12px" onclick="ClientesModule.addDocument('${id}')"><i class="bi bi-plus"></i> Adjuntar Documento</button>
      </div>
      <div class="order-history">
        <h4>Facturas Asociadas</h4>
        <table class="data-table"><thead><tr><th>Numero</th><th>Fecha</th><th>Total</th><th>Estado</th></tr></thead><tbody>
          ${facturasCliente.length > 0 ? facturasCliente.map(f => `<tr><td>${escapeHtml(f.numero)}</td><td>${formatDate(f.fecha)}</td><td>${formatCurrency(f.total)}</td><td><span class="badge badge-${f.estado}">${escapeHtml(f.estado)}</span></td></tr>`).join('') : '<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">Sin facturas</td></tr>'}
        </tbody></table>
      </div>
    `);
  },

  showAddOrder(clienteId) {
    const optionsHTML = SERVICE_TYPES.map(t => `<option value="${t}">${t}</option>`).join('');
    openModal('Añadir Pedido', `
      <form onsubmit="ClientesModule.handleAddOrder(event, '${clienteId}')">
        <div class="form-row">
          <div class="form-group"><label>Tipo de Servicio *</label><select name="tipo" class="form-select" required><option value="">Seleccionar...</option>${optionsHTML}</select></div>
          <div class="form-group"><label>Precio (€) *</label><input type="number" name="precio" class="form-input" required min="0" step="0.01" placeholder="0.00"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Fecha</label><input type="date" name="fecha" class="form-input" value="${todayISO()}"></div>
          <div class="form-group"><label>Estado</label><select name="estado" class="form-select"><option value="pendiente">Pendiente</option><option value="pagado">Pagado</option><option value="entregado">Entregado</option></select></div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="ClientesModule.showDetail('${clienteId}')">Volver</button>
          <button type="submit" class="btn btn-primary">Añadir Pedido</button>
        </div>
      </form>
    `);
  },

  async handleAddOrder(e, clienteId) {
    e.preventDefault();
    const form = e.target;
    const order = {
      id: generateId(),
      fecha: form.fecha.value,
      tipo: form.tipo.value,
      precio: parseFloat(form.precio.value),
      estado: form.estado.value
    };

    const cliente = this.clientes.find(c => c.id === clienteId);
    if (cliente) {
      let orders = typeof cliente.orders === 'string' ? JSON.parse(cliente.orders) : (cliente.orders || []);
      orders.push(order);
      await Storage.updateCliente(clienteId, { orders });
      this.clientes = await Storage.getClientes();
    }

    closeModal();
    this.showDetail(clienteId);
    showToast('Pedido añadido', 'success');
  },

  async addDocument(clienteId) {
    const result = await window.electronAPI.openFile([
      { name: 'PDFs', extensions: ['pdf'] },
      { name: 'All Files', extensions: ['*'] }
    ]);
    if (result.canceled || result.filePaths.length === 0) return;

    const filePath = result.filePaths[0];
    const fileName = filePath.split('/').pop() || filePath.split('\\').pop();

    const cliente = this.clientes.find(c => c.id === clienteId);
    if (cliente) {
      let documents = typeof cliente.documents === 'string' ? JSON.parse(cliente.documents) : (cliente.documents || []);
      documents.push({ id: generateId(), nombre: fileName, ruta: filePath, fecha: todayISO() });
      await Storage.updateCliente(clienteId, { documents });
      this.clientes = await Storage.getClientes();
    }

    closeModal();
    this.showDetail(clienteId);
    showToast('Documento adjuntado', 'success');
  },

  async refresh() {
    this.clientes = await Storage.getClientes();
    this.renderTable();
    localStorage.setItem('clientes_cache', JSON.stringify(this.clientes));
  }
};
