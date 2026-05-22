// ============================================================
// modules/inventario.js - Gestion de inventario fisico y digital
// ============================================================

const InventarioModule = {
  fisico: [],
  digital: [],

  async init() {
    this.fisico = await Storage.getInventarioFisico() || [];
    this.digital = await Storage.getInventarioDigital() || [];
    this.renderTable();
    this.bindEvents();
    localStorage.setItem('fisico_cache', JSON.stringify(this.fisico));
    localStorage.setItem('digital_cache', JSON.stringify(this.digital));
  },

  renderTable(filter = '', typeFilter = 'all') {
    const tbody = document.querySelector('#inventario-table tbody');
    let items = [];

    if (typeFilter === 'all' || typeFilter === 'fisico') {
      this.fisico.forEach(item => {
        items.push({ ...item, tipoDisplay: 'Fisico', cantidadDisplay: item.cantidad || 1, ubicacionDisplay: item.ubicacion || '-', estadoDisplay: item.estado || 'operativo' });
      });
    }
    if (typeFilter === 'all' || typeFilter === 'digital') {
      this.digital.forEach(item => {
        items.push({ ...item, tipoDisplay: 'Digital', cantidadDisplay: '1', ubicacionDisplay: item.ruta || '-', estadoDisplay: item.estado || 'activo' });
      });
    }

    if (filter) {
      const f = filter.toLowerCase();
      items = items.filter(item => item.nombre.toLowerCase().includes(f) || item.tipoDisplay.toLowerCase().includes(f) || (item.ubicacion && item.ubicacion.toLowerCase().includes(f)) || (item.ruta && item.ruta.toLowerCase().includes(f)));
    }

    if (items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-state"><p>No hay elementos en el inventario</p></td></tr>`;
      return;
    }

    tbody.innerHTML = items.map(item => {
      const badgeClass = item.tipoDisplay === 'Fisico' ? `badge-${item.estadoDisplay}` : 'badge-emitida';
      const actions = item.tipoDisplay === 'Fisico'
        ? `<button class="btn-icon" onclick="InventarioModule.showEditFisico('${item.id}')" title="Editar"><i class="bi bi-pencil"></i></button><button class="btn-icon" onclick="InventarioModule.showPrestamo('${item.id}')" title="Prestar"><i class="bi bi-box-arrow-right"></i></button><button class="btn-icon" onclick="InventarioModule.deleteFisico('${item.id}')" title="Eliminar"><i class="bi bi-trash3"></i></button>`
        : `<button class="btn-icon" onclick="InventarioModule.showEditDigital('${item.id}')" title="Editar"><i class="bi bi-pencil"></i></button><button class="btn-icon" onclick="InventarioModule.deleteDigital('${item.id}')" title="Eliminar"><i class="bi bi-trash3"></i></button>`;

      return `<tr>
        <td><strong>${escapeHtml(item.nombre)}</strong></td>
        <td><span class="badge badge-emitida">${item.tipoDisplay}</span></td>
        <td>${item.cantidadDisplay}</td>
        <td>${escapeHtml(item.ubicacionDisplay)}</td>
        <td><span class="badge ${badgeClass}">${escapeHtml(item.estadoDisplay)}</span></td>
        <td>${actions}</td>
      </tr>`;
    }).join('');
  },

  bindEvents() {
    document.getElementById('btn-new-fisico').addEventListener('click', () => this.showCreateFisico());
    document.getElementById('btn-new-digital').addEventListener('click', () => this.showCreateDigital());
    document.getElementById('inventario-search').addEventListener('input', (e) => this.renderTable(e.target.value, document.getElementById('inventario-type').value));
    document.getElementById('inventario-type').addEventListener('change', (e) => this.renderTable(document.getElementById('inventario-search').value, e.target.value));
  },

  showCreateFisico() {
    const estadosHTML = PHYSICAL_STATES.map(s => `<option value="${s}">${s.charAt(0).toUpperCase() + s.slice(1)}</option>`).join('');
    openModal('Nuevo Equipo Fisico', `
      <form onsubmit="InventarioModule.handleSaveFisico(event)">
        <div class="form-group"><label>Nombre del Equipo *</label><input type="text" name="nombre" class="form-input" required placeholder="Ej: Camara Sony A7III, PC Workstation..."></div>
        <div class="form-row">
          <div class="form-group"><label>Cantidad</label><input type="number" name="cantidad" class="form-input" value="1" min="1"></div>
          <div class="form-group"><label>Ubicacion</label><input type="text" name="ubicacion" class="form-input" placeholder="Ej: Estudio A, Servidor AWS..."></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Estado</label><select name="estado" class="form-select">${estadosHTML}</select></div>
          <div class="form-group"><label>Ultima Revision</label><input type="date" name="ultimaRevision" class="form-input" value="${todayISO()}"></div>
        </div>
        <div class="form-group"><label>Descripcion</label><textarea name="descripcion" class="form-textarea" placeholder="Especificaciones, modelo, numero de serie..."></textarea></div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Añadir Equipo</button>
        </div>
      </form>
    `);
  },

  async handleSaveFisico(e) {
    e.preventDefault();
    const form = e.target;
    const item = {
      nombre: form.nombre.value.trim(),
      cantidad: parseInt(form.cantidad.value) || 1,
      ubicacion: form.ubicacion.value.trim(),
      estado: form.estado.value,
      ultimaRevision: form.ultimaRevision.value,
      descripcion: form.descripcion.value.trim()
    };
    if (!isNotEmpty(item.nombre)) { showToast('El nombre es obligatorio', 'error'); return; }

    await Storage.addInventarioFisico(item);
    this.fisico = await Storage.getInventarioFisico();
    this.renderTable();
    localStorage.setItem('fisico_cache', JSON.stringify(this.fisico));
    closeModal();
    showToast('Equipo añadido al inventario', 'success');
  },

  showEditFisico(id) {
    const item = this.fisico.find(i => i.id === id);
    if (!item) return;
    const estadosHTML = PHYSICAL_STATES.map(s => `<option value="${s}" ${s === item.estado ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`).join('');

    openModal('Editar Equipo', `
      <form onsubmit="InventarioModule.handleUpdateFisico(event, '${id}')">
        <div class="form-group"><label>Nombre del Equipo *</label><input type="text" name="nombre" class="form-input" required value="${escapeHtml(item.nombre)}"></div>
        <div class="form-row">
          <div class="form-group"><label>Cantidad</label><input type="number" name="cantidad" class="form-input" value="${item.cantidad || 1}" min="1"></div>
          <div class="form-group"><label>Ubicacion</label><input type="text" name="ubicacion" class="form-input" value="${escapeHtml(item.ubicacion || '')}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Estado</label><select name="estado" class="form-select">${estadosHTML}</select></div>
          <div class="form-group"><label>Ultima Revision</label><input type="date" name="ultimaRevision" class="form-input" value="${item.ultimaRevision || todayISO()}"></div>
        </div>
        <div class="form-group"><label>Descripcion</label><textarea name="descripcion" class="form-textarea">${escapeHtml(item.descripcion || '')}</textarea></div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Actualizar Equipo</button>
        </div>
      </form>
    `);
  },

  async handleUpdateFisico(e, id) {
    e.preventDefault();
    const form = e.target;
    const updates = {
      nombre: form.nombre.value.trim(),
      cantidad: parseInt(form.cantidad.value) || 1,
      ubicacion: form.ubicacion.value.trim(),
      estado: form.estado.value,
      ultimaRevision: form.ultimaRevision.value,
      descripcion: form.descripcion.value.trim()
    };
    await Storage.updateInventarioFisico(id, updates);
    this.fisico = await Storage.getInventarioFisico();
    this.renderTable();
    localStorage.setItem('fisico_cache', JSON.stringify(this.fisico));
    closeModal();
    showToast('Equipo actualizado', 'success');
  },

  async deleteFisico(id) {
    const item = this.fisico.find(i => i.id === id);
    if (!item) return;
    if (!confirmAction(`¿Eliminar "${item.nombre}" del inventario?`)) return;
    await Storage.deleteInventarioFisico(id);
    this.fisico = await Storage.getInventarioFisico();
    this.renderTable();
    localStorage.setItem('fisico_cache', JSON.stringify(this.fisico));
    showToast('Equipo eliminado', 'info');
  },

  showPrestamo(id) {
    const item = this.fisico.find(i => i.id === id);
    if (!item) return;
    const prestamos = typeof item.prestamos === 'string' ? JSON.parse(item.prestamos) : (item.prestamos || []);

    const prestamosHTML = prestamos.map(p => `
      <tr><td>${escapeHtml(p.nombre)}</td><td>${formatDate(p.fechaPrestamo)}</td><td>${p.fechaDevolucion ? formatDate(p.fechaDevolucion) : '<span class="badge badge-prestado">Prestado</span>'}</td></tr>
    `).join('') || '<tr><td colspan="3" style="text-align:center;color:var(--text-muted)">Sin prestamos</td></tr>';

    openModal(`Prestamo: ${item.nombre}`, `
      <div style="margin-bottom:20px"><p><strong>Equipo:</strong> ${escapeHtml(item.nombre)}</p><p><strong>Ubicacion:</strong> ${escapeHtml(item.ubicacion || '-')}</p></div>
      <div class="order-history">
        <h4>Historial de Prestamos</h4>
        <table class="data-table"><thead><tr><th>Persona</th><th>Fecha Prestamo</th><th>Fecha Devolucion</th></tr></thead><tbody>${prestamosHTML}</tbody></table>
      </div>
      <form onsubmit="InventarioModule.handlePrestamo(event, '${id}')" style="margin-top:20px">
        <div class="form-row">
          <div class="form-group"><label>Nombre de la Persona *</label><input type="text" name="nombre" class="form-input" required placeholder="¿A quien se presta?"></div>
          <div class="form-group"><label>Fecha Devolucion Estimada</label><input type="date" name="fechaDevolucion" class="form-input"></div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
          <button type="submit" class="btn btn-primary">Registrar Prestamo</button>
        </div>
      </form>
    `);
  },

  async handlePrestamo(e, id) {
    e.preventDefault();
    const form = e.target;
    const prestamo = { id: generateId(), nombre: form.nombre.value.trim(), fechaPrestamo: todayISO(), fechaDevolucion: form.fechaDevolucion.value || null };

    const item = this.fisico.find(i => i.id === id);
    if (item) {
      let prestamos = typeof item.prestamos === 'string' ? JSON.parse(item.prestamos) : (item.prestamos || []);
      prestamos.push(prestamo);
      await Storage.updateInventarioFisico(id, { prestamos });
      this.fisico = await Storage.getInventarioFisico();
    }

    closeModal();
    this.showPrestamo(id);
    showToast('Prestamo registrado', 'success');
  },

  showCreateDigital() {
    const tiposHTML = DIGITAL_TYPES.map(t => `<option value="${t}">${t}</option>`).join('');
    openModal('Nuevo Activo Digital', `
      <form onsubmit="InventarioModule.handleSaveDigital(event)">
        <div class="form-group"><label>Nombre del Activo *</label><input type="text" name="nombre" class="form-input" required placeholder="Ej: Textura PBR Madera, Malla Edificio..."></div>
        <div class="form-row">
          <div class="form-group"><label>Tipo de Activo *</label><select name="tipoActivo" class="form-select" required><option value="">Seleccionar...</option>${tiposHTML}</select></div>
          <div class="form-group"><label>Tamaño (MB)</label><input type="number" name="tamano" class="form-input" placeholder="Ej: 250" min="0" step="0.1"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Cliente Asociado</label><input type="text" name="cliente" class="form-input" placeholder="Nombre del cliente (si aplica)"></div>
          <div class="form-group"><label>Fecha de Creacion</label><input type="date" name="fechaCreacion" class="form-input" value="${todayISO()}"></div>
        </div>
        <div class="form-group"><label>Ruta/Localizacion en Servidor/NAS</label><input type="text" name="ruta" class="form-input" placeholder="Ej: /nas/activos/pbr/madera_01/"></div>
        <div class="form-group"><label>Descripcion</label><textarea name="descripcion" class="form-textarea" placeholder="Mapas incluidos, resolucion, software usado..."></textarea></div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Añadir Activo Digital</button>
        </div>
      </form>
    `);
  },

  async handleSaveDigital(e) {
    e.preventDefault();
    const form = e.target;
    const item = {
      nombre: form.nombre.value.trim(),
      tipo_activo: form.tipoActivo.value,
      tamano: parseFloat(form.tamano.value) || 0,
      cliente: form.cliente.value.trim(),
      fecha_creacion: form.fechaCreacion.value,
      ruta: form.ruta.value.trim(),
      descripcion: form.descripcion.value.trim(),
      estado: 'activo'
    };
    if (!isNotEmpty(item.nombre) || !isNotEmpty(item.tipo_activo)) { showToast('Nombre y tipo son obligatorios', 'error'); return; }

    await Storage.addInventarioDigital(item);
    this.digital = await Storage.getInventarioDigital();
    this.renderTable();
    localStorage.setItem('digital_cache', JSON.stringify(this.digital));
    closeModal();
    showToast('Activo digital añadido', 'success');
  },

  showEditDigital(id) {
    const item = this.digital.find(i => i.id === id);
    if (!item) return;
    const tiposHTML = DIGITAL_TYPES.map(t => `<option value="${t}" ${t === item.tipo_activo ? 'selected' : ''}>${t}</option>`).join('');

    openModal('Editar Activo Digital', `
      <form onsubmit="InventarioModule.handleUpdateDigital(event, '${id}')">
        <div class="form-group"><label>Nombre del Activo *</label><input type="text" name="nombre" class="form-input" required value="${escapeHtml(item.nombre)}"></div>
        <div class="form-row">
          <div class="form-group"><label>Tipo de Activo *</label><select name="tipoActivo" class="form-select" required>${tiposHTML}</select></div>
          <div class="form-group"><label>Tamaño (MB)</label><input type="number" name="tamano" class="form-input" value="${item.tamano || 0}" min="0" step="0.1"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Cliente Asociado</label><input type="text" name="cliente" class="form-input" value="${escapeHtml(item.cliente || '')}"></div>
          <div class="form-group"><label>Fecha de Creacion</label><input type="date" name="fechaCreacion" class="form-input" value="${item.fecha_creacion || todayISO()}"></div>
        </div>
        <div class="form-group"><label>Ruta/Localizacion en Servidor/NAS</label><input type="text" name="ruta" class="form-input" value="${escapeHtml(item.ruta || '')}"></div>
        <div class="form-group"><label>Descripcion</label><textarea name="descripcion" class="form-textarea">${escapeHtml(item.descripcion || '')}</textarea></div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Actualizar Activo</button>
        </div>
      </form>
    `);
  },

  async handleUpdateDigital(e, id) {
    e.preventDefault();
    const form = e.target;
    const updates = {
      nombre: form.nombre.value.trim(),
      tipo_activo: form.tipoActivo.value,
      tamano: parseFloat(form.tamano.value) || 0,
      cliente: form.cliente.value.trim(),
      fecha_creacion: form.fechaCreacion.value,
      ruta: form.ruta.value.trim(),
      descripcion: form.descripcion.value.trim()
    };
    await Storage.updateInventarioDigital(id, updates);
    this.digital = await Storage.getInventarioDigital();
    this.renderTable();
    localStorage.setItem('digital_cache', JSON.stringify(this.digital));
    closeModal();
    showToast('Activo digital actualizado', 'success');
  },

  async deleteDigital(id) {
    const item = this.digital.find(i => i.id === id);
    if (!item) return;
    if (!confirmAction(`¿Eliminar el activo digital "${item.nombre}"?`)) return;
    await Storage.deleteInventarioDigital(id);
    this.digital = await Storage.getInventarioDigital();
    this.renderTable();
    localStorage.setItem('digital_cache', JSON.stringify(this.digital));
    showToast('Activo digital eliminado', 'info');
  },

  async refresh() {
    this.fisico = await Storage.getInventarioFisico();
    this.digital = await Storage.getInventarioDigital();
    this.renderTable();
    localStorage.setItem('fisico_cache', JSON.stringify(this.fisico));
    localStorage.setItem('digital_cache', JSON.stringify(this.digital));
  }
};
