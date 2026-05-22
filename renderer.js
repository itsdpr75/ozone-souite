// ============================================================
// renderer.js - Logica principal de la interfaz de usuario
// ============================================================

const AppState = {
  currentModule: 'dashboard',
  config: { theme: 'dark' },
  charts: {}
};

const App = {
  async init() {
    try {
      AppState.config = await Storage.getConfigAll();
    } catch (e) {
      console.error('Error loading config:', e);
      AppState.config = { theme: 'dark', company_name: 'Ozone Souite' };
    }

    applyTheme(AppState.config.theme || 'dark');
    this.applyUiScale();
    await this.loadLogo();

    const modules = [
      ['ConfigModule', typeof ConfigModule !== 'undefined' ? ConfigModule : null],
      ['ClientesModule', typeof ClientesModule !== 'undefined' ? ClientesModule : null],
      ['FacturasModule', typeof FacturasModule !== 'undefined' ? FacturasModule : null],
      ['ContabilidadModule', typeof ContabilidadModule !== 'undefined' ? ContabilidadModule : null],
      ['InventarioModule', typeof InventarioModule !== 'undefined' ? InventarioModule : null]
    ];

    for (const [name, mod] of modules) {
      try {
        if (mod && typeof mod.init === 'function') {
          await mod.init();
        }
      } catch (e) {
        console.error(`${name} init error:`, e);
      }
    }

    this.updateDashboard();
    this.bindNavigation();
    this.bindFooterButtons();
    this.bindQuickActions();

    const modalClose = document.getElementById('modal-close');
    const modalOverlay = document.getElementById('modal-overlay');
    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (modalOverlay) modalOverlay.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });

    try {
      window.electronAPI.onLockWarning((lockInfo) => {
        this.showLockWarning(lockInfo);
      });
    } catch (e) {
      console.error('Lock warning setup error:', e);
    }
  },

  async loadLogo() {
    try {
      const logoPath = await Storage.getLogoPath();
      const container = document.getElementById('sidebar-logo-container');
      const title = document.getElementById('sidebar-title');
      const subtitle = document.getElementById('sidebar-subtitle');

      if (logoPath) {
        const dataUrl = await Storage.readLogo(logoPath);
        if (dataUrl) {
          container.innerHTML = `<img src="${dataUrl}" alt="Logo">`;
          if (title) title.style.display = 'none';
          if (subtitle) subtitle.style.display = 'none';
          return;
        }
      }
    } catch (e) {
      console.error('Error loading logo:', e);
    }

    const companyName = AppState.config.company_name || 'Ozone Souite';
    const title = document.getElementById('sidebar-title');
    const subtitle = document.getElementById('sidebar-subtitle');
    if (title) title.textContent = companyName;
    if (subtitle) subtitle.textContent = 'Gestion Empresarial';
  },

  bindNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const module = btn.dataset.module;
        this.switchModule(module);
      });
    });
  },

  bindFooterButtons() {
    const themeBtn = document.getElementById('theme-toggle');
    const configBtn = document.getElementById('btn-config');
    const infoBtn = document.getElementById('btn-info');
    if (themeBtn) themeBtn.addEventListener('click', () => this.toggleTheme());
    if (configBtn) configBtn.addEventListener('click', () => ConfigModule.showConfigPanel());
    if (infoBtn) infoBtn.addEventListener('click', () => ConfigModule.showInfoPanel());
  },

  bindQuickActions() {
    const container = document.getElementById('dash-actions');
    if (!container) return;
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('.quick-action-btn');
      if (!btn) return;
      const action = btn.dataset.action;
      switch (action) {
        case 'new-cliente':
          this.switchModule('clientes');
          setTimeout(() => {
            const newBtn = document.getElementById('btn-new-cliente');
            if (newBtn) newBtn.click();
          }, 100);
          break;
        case 'new-factura':
          this.switchModule('facturas');
          setTimeout(() => {
            const newBtn = document.getElementById('btn-new-factura');
            if (newBtn) newBtn.click();
          }, 100);
          break;
        case 'new-gasto':
          this.switchModule('contabilidad');
          setTimeout(() => {
            const newBtn = document.getElementById('btn-new-gasto');
            if (newBtn) newBtn.click();
          }, 100);
          break;
        case 'backup':
          ConfigModule.showConfigPanel();
          setTimeout(() => {
            const tab = document.querySelector('.config-tab[data-tab="backups"]');
            if (tab) tab.click();
          }, 100);
          break;
        case 'report':
          showToast('Generando informe...', 'info');
          break;
        case 'inventory':
          this.switchModule('inventario');
          break;
      }
    });
  },

  async switchModule(module) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.nav-btn[data-module="${module}"]`).classList.add('active');
    document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
    document.getElementById(`module-${module}`).classList.add('active');
    AppState.currentModule = module;
    await this.refreshModule(module);
  },

  async refreshModule(module) {
    switch (module) {
      case 'dashboard': this.updateDashboard(); break;
      case 'clientes': await ClientesModule.refresh(); break;
      case 'facturas': await FacturasModule.refresh(); break;
      case 'contabilidad': await ContabilidadModule.refresh(); break;
      case 'inventario': await InventarioModule.refresh(); break;
    }
  },

  async updateDashboard() {
    const [clientes, facturas, gastos, digital, fisico] = await Promise.all([
      Storage.getClientes(),
      Storage.getFacturas(),
      Storage.getGastos(),
      Storage.getInventarioDigital(),
      Storage.getInventarioFisico()
    ]);

    this.renderKPIs(facturas, gastos, clientes, digital, fisico);
    this.renderCharts(facturas, gastos);
    this.renderAlerts(facturas, fisico);
    this.renderRecentActivity(facturas, gastos, clientes);
    this.renderQuickActions();
  },

  renderKPIs(facturas, gastos, clientes, digital, fisico) {
    const container = document.getElementById('dash-kpi-row');
    if (!container) return;

    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

    const totalFacturado = facturas.reduce((sum, f) => sum + (f.total || 0), 0);
    const totalCobrado = facturas.filter(f => f.estado === 'pagada').reduce((sum, f) => sum + (f.total || 0), 0);
    const totalGastos = gastos.reduce((sum, g) => sum + (g.importe || 0), 0);
    const beneficio = totalCobrado - totalGastos;

    const facturasThisMonth = facturas.filter(f => {
      const d = new Date(f.fecha);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });
    const facturasLastMonth = facturas.filter(f => {
      const d = new Date(f.fecha);
      return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
    });
    const gastosThisMonth = gastos.filter(g => {
      const d = new Date(g.fecha);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });
    const gastosLastMonth = gastos.filter(g => {
      const d = new Date(g.fecha);
      return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
    });

    const facturadoThisMonth = facturasThisMonth.reduce((sum, f) => sum + (f.total || 0), 0);
    const facturadoLastMonth = facturasLastMonth.reduce((sum, f) => sum + (f.total || 0), 0);
    const gastosThisMonthTotal = gastosThisMonth.reduce((sum, g) => sum + (g.importe || 0), 0);
    const gastosLastMonthTotal = gastosLastMonth.reduce((sum, g) => sum + (g.importe || 0), 0);

    const trend = (current, previous) => {
      if (previous === 0) return current > 0 ? { label: 'Nuevo', cls: 'up' } : { label: 'Sin cambios', cls: 'neutral' };
      const pct = ((current - previous) / previous * 100).toFixed(1);
      if (pct > 0) return { label: `+${pct}% vs mes anterior`, cls: 'up' };
      if (pct < 0) return { label: `${pct}% vs mes anterior`, cls: 'down' };
      return { label: 'Igual que mes anterior', cls: 'neutral' };
    };

    const facturadoTrend = trend(facturadoThisMonth, facturadoLastMonth);
    const gastosTrend = trend(gastosThisMonthTotal, gastosLastMonthTotal);

    const kpis = [
      { id: 'dash-facturado', label: 'Total Facturado', value: formatCurrency(totalFacturado), cls: 'income' },
      { id: 'dash-cobrado', label: 'Total Cobrado', value: formatCurrency(totalCobrado), cls: 'collected' },
      { id: 'dash-gastos', label: 'Total Gastos', value: formatCurrency(totalGastos), cls: 'expense' },
      { id: 'dash-beneficio', label: 'Beneficio Neto', value: formatCurrency(beneficio), cls: 'profit', color: beneficio >= 0 ? 'var(--success)' : 'var(--danger)' },
      { id: 'dash-clientes', label: 'Clientes', value: clientes.length, cls: 'income', trend: { label: `${facturasThisMonth.length} facturas este mes`, cls: 'neutral' } },
      { id: 'dash-activos', label: 'Activos Digitales', value: digital.length, cls: 'income' },
      { id: 'dash-equipos', label: 'Equipos Fisicos', value: fisico.length, cls: 'income' },
      { id: 'dash-facturas', label: 'Facturas', value: facturas.length, cls: 'income', trend: facturadoTrend }
    ];

    container.innerHTML = kpis.map(k => `
      <div class="kpi-card ${k.cls}">
        <h4>${k.label}</h4>
        <p class="kpi-value" id="${k.id}" ${k.color ? `style="color:${k.color}"` : ''}>${k.value}</p>
        ${k.trend ? `<p class="kpi-trend ${k.trend.cls}"><i class="bi bi-${k.trend.cls === 'up' ? 'arrow-up-short' : k.trend.cls === 'down' ? 'arrow-down-short' : 'dash'}"></i> ${k.trend.label}</p>` : ''}
      </div>
    `).join('');
  },

  renderCharts(facturas, gastos) {
    this.destroyCharts();
    const isDark = AppState.config.theme !== 'light';
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const textColor = isDark ? '#a0a0b0' : '#4a4a5a';

    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ month: d.getMonth(), year: d.getFullYear(), label: d.toLocaleDateString('es-ES', { month: 'short' }) });
    }

    const revenueData = months.map(m =>
      facturas.filter(f => { const d = new Date(f.fecha); return d.getMonth() === m.month && d.getFullYear() === m.year; })
        .reduce((sum, f) => sum + (f.total || 0), 0)
    );
    const expenseData = months.map(m =>
      gastos.filter(g => { const d = new Date(g.fecha); return d.getMonth() === m.month && d.getFullYear() === m.year; })
        .reduce((sum, g) => sum + (g.importe || 0), 0)
    );

    const statusCounts = { emitida: 0, pagada: 0, vencida: 0 };
    facturas.forEach(f => { if (statusCounts[f.estado] !== undefined) statusCounts[f.estado]++; });

    const monthlyInvoices = months.map(m =>
      facturas.filter(f => { const d = new Date(f.fecha); return d.getMonth() === m.month && d.getFullYear() === m.year; }).length
    );

    const defaultFont = { family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" };

    if (typeof Chart !== 'undefined') {
      const ctxRevenue = document.getElementById('chart-revenue');
      if (ctxRevenue) {
        AppState.charts.revenue = new Chart(ctxRevenue, {
          type: 'bar',
          data: {
            labels: months.map(m => m.label),
            datasets: [
              { label: 'Ingresos', data: revenueData, backgroundColor: 'rgba(74,158,255,0.7)', borderColor: '#4a9eff', borderWidth: 1, borderRadius: 6 },
              { label: 'Gastos', data: expenseData, backgroundColor: 'rgba(231,76,60,0.7)', borderColor: '#e74c3c', borderWidth: 1, borderRadius: 6 }
            ]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: textColor, font: defaultFont, usePointStyle: true, pointStyle: 'circle' } } },
            scales: {
              x: { ticks: { color: textColor, font: defaultFont }, grid: { color: gridColor } },
              y: { ticks: { color: textColor, font: defaultFont, callback: v => v + ' €' }, grid: { color: gridColor } }
            }
          }
        });
      }

      const ctxStatus = document.getElementById('chart-status');
      if (ctxStatus) {
        const statusLabels = [];
        const statusData = [];
        const statusColors = [];
        if (statusCounts.emitida > 0) { statusLabels.push('Emitida'); statusData.push(statusCounts.emitida); statusColors.push('#4a9eff'); }
        if (statusCounts.pagada > 0) { statusLabels.push('Pagada'); statusData.push(statusCounts.pagada); statusColors.push('#2ecc71'); }
        if (statusCounts.vencida > 0) { statusLabels.push('Vencida'); statusData.push(statusCounts.vencida); statusColors.push('#e74c3c'); }

        if (statusData.length === 0) {
          statusLabels.push('Sin datos'); statusData.push(1); statusColors.push('#6c6c80');
        }

        AppState.charts.status = new Chart(ctxStatus, {
          type: 'doughnut',
          data: {
            labels: statusLabels,
            datasets: [{ data: statusData, backgroundColor: statusColors, borderWidth: 0 }]
          },
          options: {
            responsive: true, maintainAspectRatio: false, cutout: '65%',
            plugins: { legend: { position: 'bottom', labels: { color: textColor, font: defaultFont, usePointStyle: true, pointStyle: 'circle', padding: 12 } } }
          }
        });
      }

      const ctxMonthly = document.getElementById('chart-monthly');
      if (ctxMonthly) {
        AppState.charts.monthly = new Chart(ctxMonthly, {
          type: 'line',
          data: {
            labels: months.map(m => m.label),
            datasets: [{
              label: 'Facturas',
              data: monthlyInvoices,
              borderColor: '#f39c12',
              backgroundColor: 'rgba(243,156,18,0.1)',
              fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#f39c12'
            }]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: textColor, font: defaultFont, usePointStyle: true, pointStyle: 'circle' } } },
            scales: {
              x: { ticks: { color: textColor, font: defaultFont }, grid: { color: gridColor } },
              y: { ticks: { color: textColor, font: defaultFont, stepSize: 1 }, grid: { color: gridColor }, beginAtZero: true }
            }
          }
        });
      }
    }
  },

  destroyCharts() {
    Object.keys(AppState.charts).forEach(key => {
      if (AppState.charts[key]) {
        AppState.charts[key].destroy();
        delete AppState.charts[key];
      }
    });
  },

  renderAlerts(facturas, fisico) {
    const container = document.getElementById('dash-alerts');
    if (!container) return;

    const alerts = [];
    const now = new Date();

    const vencidas = facturas.filter(f => f.estado === 'vencida');
    if (vencidas.length > 0) {
      alerts.push({ icon: 'danger', bi: 'exclamation-circle', text: `${vencidas.length} factura(s) vencida(s)`, detail: 'Revision urgente', badge: vencidas.length });
    }

    const proximasVencer = facturas.filter(f => {
      if (f.estado !== 'emitida') return false;
      const d = new Date(f.fecha);
      const diff = (d.getTime() + 30 * 86400000 - now.getTime()) / 86400000;
      return diff > 0 && diff <= 7;
    });
    if (proximasVencer.length > 0) {
      alerts.push({ icon: 'warning', bi: 'clock', text: `${proximasVencer.length} factura(s) por vencer`, detail: 'Vencen en 7 dias', badge: proximasVencer.length });
    }

    const enReparacion = fisico.filter(f => f.estado === 'reparacion');
    if (enReparacion.length > 0) {
      alerts.push({ icon: 'warning', bi: 'wrench', text: `${enReparacion.length} equipo(s) en reparacion`, detail: 'Equipos fuera de servicio' });
    }

    if (alerts.length === 0) {
      alerts.push({ icon: 'info', bi: 'check-circle', text: 'Sin alertas pendientes', detail: 'Todo en orden' });
    }

    container.innerHTML = alerts.slice(0, 5).map(a => `
      <div class="alert-item">
        <div class="alert-icon ${a.icon}"><i class="bi bi-${a.bi}"></i></div>
        <div class="alert-text"><strong>${a.text}</strong><span>${a.detail}</span></div>
        ${a.badge ? `<span class="alert-badge">${a.badge}</span>` : ''}
      </div>
    `).join('');
  },

  renderRecentActivity(facturas, gastos, clientes) {
    const container = document.getElementById('dash-recent');
    if (!container) return;

    const activities = [];

    facturas.slice(-5).reverse().forEach(f => {
      activities.push({
        icon: 'invoice', bi: 'receipt',
        text: `Factura ${f.numero}`,
        detail: `${f.cliente || 'Sin cliente'} - ${formatDate(f.fecha)}`,
        amount: formatCurrency(f.total || 0)
      });
    });

    gastos.slice(-3).reverse().forEach(g => {
      activities.push({
        icon: 'expense', bi: 'cash',
        text: g.concepto || 'Gasto',
        detail: `${g.categoria || 'Sin categoria'} - ${formatDate(g.fecha)}`,
        amount: '-' + formatCurrency(g.importe || 0)
      });
    });

    clientes.slice(-2).reverse().forEach(c => {
      activities.push({
        icon: 'client', bi: 'person-plus',
        text: `Nuevo cliente: ${c.nombre}`,
        detail: `NIF: ${c.nif || 'Sin NIF'}`,
        amount: ''
      });
    });

    activities.sort((a, b) => 0);

    container.innerHTML = activities.length === 0
      ? '<p style="color:var(--text-muted);font-size:0.85rem;text-align:center;padding:20px">Sin actividad reciente</p>'
      : activities.slice(0, 8).map(a => `
        <div class="activity-item">
          <div class="activity-icon ${a.icon}"><i class="bi bi-${a.bi}"></i></div>
          <div class="activity-text"><strong>${a.text}</strong><span>${a.detail}</span></div>
          ${a.amount ? `<span class="activity-amount">${a.amount}</span>` : ''}
        </div>
      `).join('');
  },

  renderQuickActions() {
    const container = document.getElementById('dash-actions');
    if (!container) return;

    const actions = [
      { action: 'new-cliente', bi: 'person-plus', label: 'Nuevo Cliente' },
      { action: 'new-factura', bi: 'receipt', label: 'Nueva Factura' },
      { action: 'new-gasto', bi: 'cash', label: 'Registrar Gasto' },
      { action: 'inventory', bi: 'box', label: 'Inventario' },
      { action: 'backup', bi: 'cloud-arrow-up', label: 'Backup' },
      { action: 'report', bi: 'file-earmark-bar-graph', label: 'Informe' }
    ];

    container.innerHTML = actions.map(a => `
      <div class="quick-action-btn" data-action="${a.action}">
        <i class="bi bi-${a.bi}"></i>
        <span>${a.label}</span>
      </div>
    `).join('');
  },

  async toggleTheme() {
    const newTheme = AppState.config.theme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    try { await Storage.setConfig('theme', newTheme); } catch (e) { console.error(e); }
    AppState.config.theme = newTheme;
    this.updateDashboard();
  },

  applyUiScale() {
    const scale = AppState.config.ui_scale || 100;
    document.body.style.zoom = scale + '%';
  },

  showLockWarning(lockInfo) {
    document.getElementById('lock-username').textContent = lockInfo.username;
    document.getElementById('lock-hostname').textContent = lockInfo.hostname;
    document.getElementById('lock-time').textContent = lockInfo.openTimeFormatted;
    document.getElementById('lock-duration').textContent = lockInfo.timeAgo;
    document.getElementById('lock-overlay').classList.remove('hidden');
  },

  closeOnLock() {
    document.getElementById('lock-overlay').classList.add('hidden');
    window.close();
  },

  async forceOpen() {
    await Storage.forceRemoveLock();
    await window.electronAPI.lockCreate();
    document.getElementById('lock-overlay').classList.add('hidden');
    showToast('Apertura forzada. Lock eliminado.', 'info');
  }
};

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  AppState.config.theme = theme;
  const icon = document.getElementById('theme-icon');
  if (icon) {
    icon.className = theme === 'dark' ? 'bi bi-moon' : 'bi bi-sun';
  }
}

document.addEventListener('DOMContentLoaded', () => App.init());
