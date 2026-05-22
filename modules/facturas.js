// ============================================================
// modules/facturas.js - Gestion completa de facturas
// ============================================================

const FacturasModule = {
  facturas: [],
  clientes: [],

  async init() {
    this.facturas = await Storage.getFacturas() || [];
    this.clientes = await Storage.getClientes() || [];
    this.renderTable();
    this.bindEvents();
    localStorage.setItem('facturas_cache', JSON.stringify(this.facturas));
    localStorage.setItem('clientes_cache', JSON.stringify(this.clientes));
  },

  renderTable(filter = '', statusFilter = 'all') {
    const tbody = document.querySelector('#facturas-table tbody');
    let filtered = [...this.facturas];

    if (statusFilter !== 'all') filtered = filtered.filter(f => f.estado === statusFilter);
    if (filter) {
      const f = filter.toLowerCase();
      filtered = filtered.filter(fact => {
        const cliente = this.clientes.find(c => c.id === fact.cliente_id);
        return fact.numero.toLowerCase().includes(f) || (cliente && cliente.nombre.toLowerCase().includes(f));
      });
    }

    filtered.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-state"><p>No hay facturas registradas</p><button class="btn btn-primary" onclick="FacturasModule.showCreateForm()"><i class="bi bi-plus"></i> Crear primera factura</button></td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(f => {
      const cliente = this.clientes.find(c => c.id === f.cliente_id);
      return `
        <tr>
          <td><strong>${escapeHtml(f.numero)}</strong></td>
          <td>${formatDate(f.fecha)}</td>
          <td>${escapeHtml(cliente ? cliente.nombre : 'Desconocido')}</td>
          <td>${formatCurrency(f.total)}</td>
          <td><span class="badge badge-${f.estado}">${escapeHtml(f.estado)}</span></td>
          <td>
            <button class="btn-icon" onclick="FacturasModule.previewInvoice('${f.id}')" title="Ver"><i class="bi bi-eye"></i></button>
            ${f.estado !== 'pagada' ? `<button class="btn-icon" onclick="FacturasModule.showEditForm('${f.id}')" title="Editar"><i class="bi bi-pencil"></i></button>` : ''}
            ${f.estado !== 'pagada' ? `<button class="btn-icon" onclick="FacturasModule.anularFactura('${f.id}')" title="Anular"><i class="bi bi-x-circle"></i></button>` : ''}
            <button class="btn-icon" onclick="FacturasModule.downloadPDF('${f.id}')" title="PDF"><i class="bi bi-file-earmark-arrow-down"></i></button>
          </td>
        </tr>
      `;
    }).join('');
  },

  bindEvents() {
    document.getElementById('btn-new-factura').addEventListener('click', () => this.showCreateForm());
    document.getElementById('factura-search').addEventListener('input', (e) => this.renderTable(e.target.value, document.getElementById('factura-filter').value));
    document.getElementById('factura-filter').addEventListener('change', (e) => this.renderTable(document.getElementById('factura-search').value, e.target.value));
  },

  showCreateForm() {
    const clientesOptions = this.clientes.map(c => `<option value="${c.id}">${escapeHtml(c.nombre)} (${c.nif})</option>`).join('');
    openModal('Nueva Factura', `
      <form id="form-factura" onsubmit="FacturasModule.handleCreate(event)">
        <div class="form-row">
          <div class="form-group"><label>Cliente *</label><select name="clienteId" class="form-select" required><option value="">Seleccionar cliente...</option>${clientesOptions}</select></div>
          <div class="form-group"><label>Fecha *</label><input type="date" name="fecha" class="form-input" required value="${todayISO()}"></div>
        </div>
        <div class="form-group">
          <label>Lineas de Factura *</label>
          <div id="factura-lineas">
            <div class="form-row linea-row" style="margin-bottom:8px">
              <input type="text" name="concepto" class="form-input" placeholder="Concepto" required style="flex:3">
              <input type="number" name="cantidad" class="form-input" placeholder="Cant." value="1" min="1" required style="flex:1">
              <input type="number" name="precioUnitario" class="form-input" placeholder="Precio" step="0.01" min="0" required style="flex:1">
            </div>
          </div>
          <button type="button" class="btn btn-sm btn-secondary" onclick="FacturasModule.addLinea()" style="margin-top:8px"><i class="bi bi-plus"></i> Añadir Linea</button>
        </div>
        <div class="form-row">
          <div class="form-group"><label>IVA (%)</label><input type="number" name="iva" class="form-input" value="21" min="0" max="100" step="1"></div>
          <div class="form-group"><label>Estado</label><select name="estado" class="form-select"><option value="emitida">Emitida</option><option value="pagada">Pagada</option><option value="vencida">Vencida</option></select></div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Crear Factura</button>
        </div>
      </form>
    `);
  },

  addLinea() {
    const container = document.getElementById('factura-lineas');
    const div = document.createElement('div');
    div.className = 'form-row linea-row';
    div.style.marginBottom = '8px';
    div.innerHTML = `
      <input type="text" name="concepto" class="form-input" placeholder="Concepto" required style="flex:3">
      <input type="number" name="cantidad" class="form-input" placeholder="Cant." value="1" min="1" required style="flex:1">
      <input type="number" name="precioUnitario" class="form-input" placeholder="Precio" step="0.01" min="0" required style="flex:1">
      <button type="button" class="btn-icon" onclick="this.parentElement.remove()" style="flex:0"><i class="bi bi-x"></i></button>
    `;
    container.appendChild(div);
  },

  async handleCreate(e) {
    e.preventDefault();
    const form = e.target;
    const clienteId = form.clienteId.value;
    const fecha = form.fecha.value;
    const iva = parseFloat(form.iva.value) || 21;
    const estado = form.estado.value;

    const lineaRows = document.querySelectorAll('.linea-row');
    const lineas = [];
    for (const row of lineaRows) {
      const concepto = row.querySelector('[name="concepto"]').value.trim();
      const cantidad = parseInt(row.querySelector('[name="cantidad"]').value) || 1;
      const precioUnitario = parseFloat(row.querySelector('[name="precioUnitario"]').value) || 0;
      if (!concepto || precioUnitario <= 0) { showToast('Completa todas las lineas correctamente', 'error'); return; }
      lineas.push({ concepto, cantidad, precioUnitario });
    }
    if (lineas.length === 0) { showToast('Añade al menos una linea de factura', 'error'); return; }

    const subtotal = lineas.reduce((sum, l) => sum + (l.cantidad * l.precioUnitario), 0);
    const total = subtotal + (subtotal * iva / 100);

    await Storage.addFactura({ cliente_id: clienteId, fecha, lineas, subtotal, iva, total, estado });
    this.facturas = await Storage.getFacturas();
    this.renderTable();
    localStorage.setItem('facturas_cache', JSON.stringify(this.facturas));
    closeModal();
    showToast('Factura creada correctamente', 'success');
  },

  showEditForm(id) {
    const factura = this.facturas.find(f => f.id === id);
    if (!factura || factura.estado === 'pagada') return;

    const clientesOptions = this.clientes.map(c => `<option value="${c.id}" ${c.id === factura.cliente_id ? 'selected' : ''}>${escapeHtml(c.nombre)} (${c.nif})</option>`).join('');
    const lineas = typeof factura.lineas === 'string' ? JSON.parse(factura.lineas) : (factura.lineas || []);
    const lineasHTML = lineas.map(l => `
      <div class="form-row linea-row" style="margin-bottom:8px">
        <input type="text" name="concepto" class="form-input" placeholder="Concepto" value="${escapeHtml(l.concepto)}" required style="flex:3">
        <input type="number" name="cantidad" class="form-input" placeholder="Cant." value="${l.cantidad}" min="1" required style="flex:1">
        <input type="number" name="precioUnitario" class="form-input" placeholder="Precio" value="${l.precioUnitario}" step="0.01" min="0" required style="flex:1">
        <button type="button" class="btn-icon" onclick="this.parentElement.remove()" style="flex:0"><i class="bi bi-x"></i></button>
      </div>
    `).join('');

    openModal('Editar Factura', `
      <form id="form-factura-edit" onsubmit="FacturasModule.handleUpdate(event, '${id}')">
        <div class="form-row">
          <div class="form-group"><label>Cliente *</label><select name="clienteId" class="form-select" required>${clientesOptions}</select></div>
          <div class="form-group"><label>Fecha *</label><input type="date" name="fecha" class="form-input" required value="${factura.fecha}"></div>
        </div>
        <div class="form-group">
          <label>Lineas de Factura *</label>
          <div id="factura-lineas">${lineasHTML}</div>
          <button type="button" class="btn btn-sm btn-secondary" onclick="FacturasModule.addLinea()" style="margin-top:8px"><i class="bi bi-plus"></i> Añadir Linea</button>
        </div>
        <div class="form-row">
          <div class="form-group"><label>IVA (%)</label><input type="number" name="iva" class="form-input" value="${factura.iva}" min="0" max="100" step="1"></div>
          <div class="form-group"><label>Estado</label><select name="estado" class="form-select">
            <option value="emitida" ${factura.estado === 'emitida' ? 'selected' : ''}>Emitida</option>
            <option value="pagada" ${factura.estado === 'pagada' ? 'selected' : ''}>Pagada</option>
            <option value="vencida" ${factura.estado === 'vencida' ? 'selected' : ''}>Vencida</option>
          </select></div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Actualizar Factura</button>
        </div>
      </form>
    `);
  },

  async handleUpdate(e, id) {
    e.preventDefault();
    const form = e.target;
    const clienteId = form.clienteId.value;
    const fecha = form.fecha.value;
    const iva = parseFloat(form.iva.value) || 21;
    const estado = form.estado.value;

    const lineaRows = document.querySelectorAll('.linea-row');
    const lineas = [];
    for (const row of lineaRows) {
      const concepto = row.querySelector('[name="concepto"]').value.trim();
      const cantidad = parseInt(row.querySelector('[name="cantidad"]').value) || 1;
      const precioUnitario = parseFloat(row.querySelector('[name="precioUnitario"]').value) || 0;
      if (!concepto || precioUnitario <= 0) { showToast('Completa todas las lineas correctamente', 'error'); return; }
      lineas.push({ concepto, cantidad, precioUnitario });
    }
    if (lineas.length === 0) { showToast('Añade al menos una linea', 'error'); return; }

    const subtotal = lineas.reduce((sum, l) => sum + (l.cantidad * l.precioUnitario), 0);
    const total = subtotal + (subtotal * iva / 100);

    await Storage.updateFactura(id, { cliente_id: clienteId, fecha, lineas, subtotal, iva, total, estado });
    this.facturas = await Storage.getFacturas();
    this.renderTable();
    localStorage.setItem('facturas_cache', JSON.stringify(this.facturas));
    closeModal();
    showToast('Factura actualizada', 'success');
  },

  async anularFactura(id) {
    const factura = this.facturas.find(f => f.id === id);
    if (!factura || factura.estado === 'pagada') return;
    if (!confirmAction(`¿Anular la factura ${factura.numero}?`)) return;

    await Storage.updateFactura(id, { estado: 'vencida' });
    this.facturas = await Storage.getFacturas();
    this.renderTable();
    localStorage.setItem('facturas_cache', JSON.stringify(this.facturas));
    showToast('Factura anulada', 'info');
  },

  previewInvoice(id) {
    const factura = this.facturas.find(f => f.id === id);
    if (!factura) return;
    const cliente = this.clientes.find(c => c.id === factura.cliente_id);
    PDFGenerator.previewInvoice(factura, cliente);
  },

  downloadPDF(id) {
    const factura = this.facturas.find(f => f.id === id);
    if (!factura) return;
    const cliente = this.clientes.find(c => c.id === factura.cliente_id);
    localStorage.setItem('facturas_cache', JSON.stringify(this.facturas));
    localStorage.setItem('clientes_cache', JSON.stringify(this.clientes));
    PDFGenerator.printInvoice(id);
  },

  async refresh() {
    this.facturas = await Storage.getFacturas();
    this.clientes = await Storage.getClientes();
    this.renderTable();
    localStorage.setItem('facturas_cache', JSON.stringify(this.facturas));
    localStorage.setItem('clientes_cache', JSON.stringify(this.clientes));
  }
};
