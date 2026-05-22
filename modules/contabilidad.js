// ============================================================
// modules/contabilidad.js - Panel contable y libro diario
// ============================================================

const ContabilidadModule = {
  facturas: [],
  gastos: [],

  async init() {
    this.facturas = await Storage.getFacturas() || [];
    this.gastos = await Storage.getGastos() || [];
    this.render();
    this.bindEvents();
    localStorage.setItem('facturas_cache', JSON.stringify(this.facturas));
    localStorage.setItem('gastos_cache', JSON.stringify(this.gastos));
  },

  render() {
    this.renderKPIs();
    this.renderLibroDiario();
  },

  renderKPIs() {
    const totalFacturado = this.facturas.reduce((sum, f) => sum + (f.total || 0), 0);
    const totalCobrado = this.facturas.filter(f => f.estado === 'pagada').reduce((sum, f) => sum + (f.total || 0), 0);
    const totalGastos = this.gastos.reduce((sum, g) => sum + (g.importe || 0), 0);
    const beneficioNeto = totalCobrado - totalGastos;

    document.getElementById('kpi-facturado').textContent = formatCurrency(totalFacturado);
    document.getElementById('kpi-cobrado').textContent = formatCurrency(totalCobrado);
    document.getElementById('kpi-gastos').textContent = formatCurrency(totalGastos);

    const beneficioEl = document.getElementById('kpi-beneficio');
    beneficioEl.textContent = formatCurrency(beneficioNeto);
    beneficioEl.style.color = beneficioNeto >= 0 ? 'var(--success)' : 'var(--danger)';
  },

  renderLibroDiario() {
    const tbody = document.querySelector('#libro-diario-table tbody');
    const clientes = JSON.parse(localStorage.getItem('clientes_cache') || '[]');
    const asientos = [];

    this.facturas.forEach(f => {
      const cliente = clientes.find(c => c.id === f.cliente_id);
      asientos.push({
        fecha: f.fecha,
        concepto: `Factura ${f.numero} - ${cliente ? cliente.nombre : 'Desconocido'}`,
        tipo: 'Ingreso',
        importe: f.total || 0,
        esIngreso: true
      });
    });

    this.gastos.forEach(g => {
      asientos.push({
        fecha: g.fecha,
        concepto: `${g.concepto} (${g.categoria})`,
        tipo: 'Gasto',
        importe: g.importe || 0,
        esIngreso: false
      });
    });

    asientos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    if (asientos.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="empty-state"><p>No hay movimientos registrados</p></td></tr>`;
      return;
    }

    tbody.innerHTML = asientos.map(a => `
      <tr>
        <td>${formatDate(a.fecha)}</td>
        <td>${escapeHtml(a.concepto)}</td>
        <td><span class="badge ${a.esIngreso ? 'badge-pagada' : 'badge-vencida'}">${a.tipo}</span></td>
        <td style="color:${a.esIngreso ? 'var(--success)' : 'var(--danger)'}; font-weight:600">${a.esIngreso ? '+' : '-'}${formatCurrency(a.importe)}</td>
      </tr>
    `).join('');
  },

  bindEvents() {
    document.getElementById('btn-new-gasto').addEventListener('click', () => this.showGastoForm());
    document.getElementById('btn-export-csv').addEventListener('click', () => this.exportCSV());
  },

  showGastoForm() {
    const categoriasHTML = EXPENSE_CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('');
    openModal('Registrar Gasto', `
      <form onsubmit="ContabilidadModule.handleSaveGasto(event)">
        <div class="form-group"><label>Concepto *</label><input type="text" name="concepto" class="form-input" required placeholder="Descripcion del gasto"></div>
        <div class="form-row">
          <div class="form-group"><label>Importe (€) *</label><input type="number" name="importe" class="form-input" required min="0" step="0.01" placeholder="0.00"></div>
          <div class="form-group"><label>Fecha</label><input type="date" name="fecha" class="form-input" value="${todayISO()}"></div>
        </div>
        <div class="form-group"><label>Categoria</label><select name="categoria" class="form-select">${categoriasHTML}</select></div>
        <div class="form-group"><label>Notas</label><textarea name="notas" class="form-textarea" placeholder="Observaciones adicionales..."></textarea></div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Registrar Gasto</button>
        </div>
      </form>
    `);
  },

  async handleSaveGasto(e) {
    e.preventDefault();
    const form = e.target;
    const gasto = {
      concepto: form.concepto.value.trim(),
      importe: parseFloat(form.importe.value) || 0,
      fecha: form.fecha.value,
      categoria: form.categoria.value,
      notas: form.notas.value.trim()
    };

    if (!isNotEmpty(gasto.concepto) || gasto.importe <= 0) {
      showToast('Completa los campos obligatorios correctamente', 'error');
      return;
    }

    await Storage.addGasto(gasto);
    this.gastos = await Storage.getGastos();
    this.render();
    localStorage.setItem('gastos_cache', JSON.stringify(this.gastos));
    closeModal();
    showToast('Gasto registrado correctamente', 'success');
  },

  exportCSV() {
    const clientes = JSON.parse(localStorage.getItem('clientes_cache') || '[]');
    const asientos = [];

    this.facturas.forEach(f => {
      const cliente = clientes.find(c => c.id === f.cliente_id);
      asientos.push({ fecha: f.fecha, concepto: `Factura ${f.numero} - ${cliente ? cliente.nombre : 'Desconocido'}`, tipo: 'Ingreso', importe: f.total || 0 });
    });

    this.gastos.forEach(g => {
      asientos.push({ fecha: g.fecha, concepto: `${g.concepto} (${g.categoria})`, tipo: 'Gasto', importe: g.importe || 0 });
    });

    asientos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    let csv = 'Fecha,Concepto,Tipo,Importe\n';
    asientos.forEach(a => { csv += `"${a.fecha}","${a.concepto}","${a.tipo}",${a.importe}\n`; });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `contabilidad_ozone-souite_${todayISO()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('CSV exportado correctamente', 'success');
  },

  async refresh() {
    this.facturas = await Storage.getFacturas();
    this.gastos = await Storage.getGastos();
    this.render();
    localStorage.setItem('facturas_cache', JSON.stringify(this.facturas));
    localStorage.setItem('gastos_cache', JSON.stringify(this.gastos));
  }
};
