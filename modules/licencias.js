const LicenciasModule = {
  licencias: [],

  async init() {
    this.licencias = await Storage.getLicencias() || [];
    this.renderTable();
    this.bindEvents();
  },

  getEstadoReal(licencia) {
    if (!licencia.fecha_expiracion) return licencia.estado;
    const now = new Date();
    const exp = new Date(licencia.fecha_expiracion);
    const diff = (exp.getTime() - now.getTime()) / 86400000;

    if (diff < 0) return 'expirada';
    if (diff <= 30) return 'por_vencer';
    return 'activa';
  },

  renderTable(filter = '', estadoFilter = 'all') {
    const tbody = document.querySelector('#licencias-table tbody');
    const filtered = this.licencias.filter(l => {
      const matchSearch = !filter || (() => {
        const f = filter.toLowerCase();
        return l.nombre.toLowerCase().includes(f) ||
          (l.proveedor || '').toLowerCase().includes(f) ||
          (l.categoria || '').toLowerCase().includes(f);
      })();

      const estadoReal = this.getEstadoReal(l);
      const matchEstado = estadoFilter === 'all' || estadoReal === estadoFilter;

      return matchSearch && matchEstado;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-state"><p>No hay licencias registradas</p><button class="btn btn-primary" onclick="LicenciasModule.showCreateForm()"><i class="bi bi-plus"></i> Añadir primera licencia</button></td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(l => {
      const estadoReal = this.getEstadoReal(l);
      const diasRestantes = l.fecha_expiracion ? Math.ceil((new Date(l.fecha_expiracion).getTime() - Date.now()) / 86400000) : null;

      return `
        <tr>
          <td><strong>${escapeHtml(l.nombre)}</strong></td>
          <td>${escapeHtml(l.proveedor || '-')}</td>
          <td><span class="badge badge-${l.tipo}">${escapeHtml(l.tipo)}</span></td>
          <td>${l.fecha_expiracion ? formatDate(l.fecha_expiracion) : '-'}</td>
          <td>${diasRestantes !== null ? `${diasRestantes} dias` : '-'}</td>
          <td>${formatCurrency(l.coste || 0)}</td>
          <td><span class="badge badge-${estadoReal}">${estadoReal.replace('_', ' ')}</span></td>
          <td>
            <button class="btn-icon" onclick="LicenciasModule.showDetail('${l.id}')" title="Ver detalle"><i class="bi bi-eye"></i></button>
            <button class="btn-icon" onclick="LicenciasModule.showEditForm('${l.id}')" title="Editar"><i class="bi bi-pencil"></i></button>
            <button class="btn-icon" onclick="LicenciasModule.deleteLicencia('${l.id}')" title="Eliminar"><i class="bi bi-trash3"></i></button>
          </td>
        </tr>
      `;
    }).join('');
  },

  bindEvents() {
    document.getElementById('btn-new-licencia').addEventListener('click', () => this.showCreateForm());
    document.getElementById('licencia-search').addEventListener('input', (e) => this.renderTable(e.target.value, this.getEstadoFilter()));
    document.getElementById('licencia-filter').addEventListener('change', (e) => this.renderTable(document.getElementById('licencia-search').value, e.target.value));
  },

  getEstadoFilter() {
    const el = document.getElementById('licencia-filter');
    return el ? el.value : 'all';
  },

  showCreateForm() {
    const tipos = ['subscription', 'perpetual', 'trial', 'opensource'];
    const categorias = ['General', 'Diseño 3D', 'Fotogrametria', 'Ofimatica', 'Desarrollo', 'Sistema', 'Seguridad'];

    openModal('Nueva Licencia', `
      <form id="form-licencia" onsubmit="LicenciasModule.handleSave(event)">
        <div class="form-group"><label>Nombre del Software *</label><input type="text" name="nombre" class="form-input" required placeholder="Ej: Adobe Photoshop, Meshroom..."></div>
        <div class="form-row">
          <div class="form-group"><label>Proveedor / Fabricante</label><input type="text" name="proveedor" class="form-input" placeholder="Ej: Adobe, Autodesk..."></div>
          <div class="form-group"><label>Version</label><input type="text" name="version" class="form-input" placeholder="Ej: 2024, 1.5.2..."></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Categoria</label><select name="categoria" class="form-select">${categorias.map(c => `<option value="${c}">${c}</option>`).join('')}</select></div>
          <div class="form-group"><label>Tipo de Licencia</label><select name="tipo" class="form-select">${tipos.map(t => `<option value="${t}">${t}</option>`).join('')}</select></div>
        </div>
        <div class="form-group"><label>Clave de Licencia</label><input type="text" name="clave" class="form-input" placeholder="XXXXX-XXXXX-XXXXX-XXXXX"></div>
        <div class="form-row">
          <div class="form-group"><label>Fecha de Inicio</label><input type="date" name="fecha_inicio" class="form-input" value="${todayISO()}"></div>
          <div class="form-group"><label>Fecha de Expiracion</label><input type="date" name="fecha_expiracion" class="form-input"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Coste (€)</label><input type="number" name="coste" class="form-input" min="0" step="0.01" placeholder="0.00"></div>
          <div class="form-group"><label>Numero de Asientos</label><input type="number" name="asientos" class="form-input" min="1" value="1"></div>
        </div>
        <div class="form-group">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="checkbox" name="auto_renovacion">
            <span>Renovacion automatica</span>
          </label>
        </div>
        <div class="form-group"><label>Notas</label><textarea name="notas" class="form-textarea" placeholder="Observaciones sobre la licencia..."></textarea></div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Guardar Licencia</button>
        </div>
      </form>
    `);
  },

  showEditForm(id) {
    const licencia = this.licencias.find(l => l.id === id);
    if (!licencia) return;

    const tipos = ['subscription', 'perpetual', 'trial', 'opensource'];
    const categorias = ['General', 'Diseño 3D', 'Fotogrametria', 'Ofimatica', 'Desarrollo', 'Sistema', 'Seguridad'];

    openModal('Editar Licencia', `
      <form id="form-licencia" onsubmit="LicenciasModule.handleUpdate(event, '${id}')">
        <div class="form-group"><label>Nombre del Software *</label><input type="text" name="nombre" class="form-input" required value="${escapeHtml(licencia.nombre)}"></div>
        <div class="form-row">
          <div class="form-group"><label>Proveedor / Fabricante</label><input type="text" name="proveedor" class="form-input" value="${escapeHtml(licencia.proveedor || '')}"></div>
          <div class="form-group"><label>Version</label><input type="text" name="version" class="form-input" value="${escapeHtml(licencia.version || '')}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Categoria</label><select name="categoria" class="form-select">${categorias.map(c => `<option value="${c}" ${licencia.categoria === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
          <div class="form-group"><label>Tipo de Licencia</label><select name="tipo" class="form-select">${tipos.map(t => `<option value="${t}" ${licencia.tipo === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
        </div>
        <div class="form-group"><label>Clave de Licencia</label><input type="text" name="clave" class="form-input" value="${escapeHtml(licencia.clave || '')}"></div>
        <div class="form-row">
          <div class="form-group"><label>Fecha de Inicio</label><input type="date" name="fecha_inicio" class="form-input" value="${licencia.fecha_inicio || ''}"></div>
          <div class="form-group"><label>Fecha de Expiracion</label><input type="date" name="fecha_expiracion" class="form-input" value="${licencia.fecha_expiracion || ''}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Coste (€)</label><input type="number" name="coste" class="form-input" min="0" step="0.01" value="${licencia.coste || 0}"></div>
          <div class="form-group"><label>Numero de Asientos</label><input type="number" name="asientos" class="form-input" min="1" value="${licencia.asientos || 1}"></div>
        </div>
        <div class="form-group">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="checkbox" name="auto_renovacion" ${licencia.auto_renovacion ? 'checked' : ''}>
            <span>Renovacion automatica</span>
          </label>
        </div>
        <div class="form-group"><label>Notas</label><textarea name="notas" class="form-textarea">${escapeHtml(licencia.notas || '')}</textarea></div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Actualizar Licencia</button>
        </div>
      </form>
    `);
  },

  async handleSave(e) {
    e.preventDefault();
    const form = e.target;
    const licencia = {
      nombre: form.nombre.value.trim(),
      proveedor: form.proveedor.value.trim(),
      version: form.version.value.trim(),
      categoria: form.categoria.value,
      tipo: form.tipo.value,
      clave: form.clave.value.trim(),
      fecha_inicio: form.fecha_inicio.value,
      fecha_expiracion: form.fecha_expiracion.value,
      coste: parseFloat(form.coste.value) || 0,
      asientos: parseInt(form.asientos.value) || 1,
      auto_renovacion: form.auto_renovacion.checked ? 1 : 0,
      notas: form.notas.value.trim()
    };

    if (!isNotEmpty(licencia.nombre)) {
      showToast('El nombre del software es obligatorio', 'error');
      return;
    }

    await Storage.addLicencia(licencia);
    this.licencias = await Storage.getLicencias();
    this.renderTable();
    closeModal();
    showToast('Licencia creada correctamente', 'success');
  },

  async handleUpdate(e, id) {
    e.preventDefault();
    const form = e.target;
    const updates = {
      nombre: form.nombre.value.trim(),
      proveedor: form.proveedor.value.trim(),
      version: form.version.value.trim(),
      categoria: form.categoria.value,
      tipo: form.tipo.value,
      clave: form.clave.value.trim(),
      fecha_inicio: form.fecha_inicio.value,
      fecha_expiracion: form.fecha_expiracion.value,
      coste: parseFloat(form.coste.value) || 0,
      asientos: parseInt(form.asientos.value) || 1,
      auto_renovacion: form.auto_renovacion.checked ? 1 : 0,
      notas: form.notas.value.trim()
    };

    if (!isNotEmpty(updates.nombre)) {
      showToast('El nombre del software es obligatorio', 'error');
      return;
    }

    await Storage.updateLicencia(id, updates);
    this.licencias = await Storage.getLicencias();
    this.renderTable();
    closeModal();
    showToast('Licencia actualizada correctamente', 'success');
  },

  async deleteLicencia(id) {
    const licencia = this.licencias.find(l => l.id === id);
    if (!licencia) return;
    if (!confirmAction(`¿Eliminar la licencia "${licencia.nombre}"? Esta accion no se puede deshacer.`)) return;

    await Storage.deleteLicencia(id);
    this.licencias = await Storage.getLicencias();
    this.renderTable();
    showToast('Licencia eliminada', 'info');
  },

  showDetail(id) {
    const licencia = this.licencias.find(l => l.id === id);
    if (!licencia) return;

    const estadoReal = this.getEstadoReal(licencia);
    const diasRestantes = licencia.fecha_expiracion ? Math.ceil((new Date(licencia.fecha_expiracion).getTime() - Date.now()) / 86400000) : null;

    openModal(`Licencia: ${licencia.nombre}`, `
      <div style="margin-bottom:20px">
        <p><strong>Nombre:</strong> ${escapeHtml(licencia.nombre)}</p>
        <p><strong>Proveedor:</strong> ${escapeHtml(licencia.proveedor || '-')}</p>
        <p><strong>Version:</strong> ${escapeHtml(licencia.version || '-')}</p>
        <p><strong>Categoria:</strong> ${escapeHtml(licencia.categoria || '-')}</p>
        <p><strong>Tipo:</strong> <span class="badge badge-${licencia.tipo}">${licencia.tipo}</span></p>
        ${licencia.clave ? `<p><strong>Clave:</strong> <code style="background:var(--input-bg);padding:4px 8px;border-radius:4px">${escapeHtml(licencia.clave)}</code></p>` : ''}
        <p><strong>Fecha Inicio:</strong> ${licencia.fecha_inicio ? formatDate(licencia.fecha_inicio) : '-'}</p>
        <p><strong>Fecha Expiracion:</strong> ${licencia.fecha_expiracion ? formatDate(licencia.fecha_expiracion) : '-'}</p>
        <p><strong>Dias Restantes:</strong> ${diasRestantes !== null ? `${diasRestantes} dias` : 'Sin limite'}</p>
        <p><strong>Coste:</strong> ${formatCurrency(licencia.coste || 0)}</p>
        <p><strong>Asientos:</strong> ${licencia.asientos || 1}</p>
        <p><strong>Renovacion Automatica:</strong> ${licencia.auto_renovacion ? 'Si' : 'No'}</p>
        <p><strong>Estado:</strong> <span class="badge badge-${estadoReal}">${estadoReal.replace('_', ' ')}</span></p>
        ${licencia.notas ? `<p><strong>Notas:</strong> ${escapeHtml(licencia.notas)}</p>` : ''}
      </div>
      <div class="form-actions">
        <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
        <button class="btn btn-primary" onclick="closeModal();LicenciasModule.showEditForm('${id}')"><i class="bi bi-pencil"></i> Editar</button>
      </div>
    `);
  },

  async refresh() {
    this.licencias = await Storage.getLicencias();
    this.renderTable();
  }
};
