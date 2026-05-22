const Dashboard = {
  async update() {
    const [clientes, facturas, gastos, digital, fisico, licencias] = await Promise.all([
      Storage.getClientes(),
      Storage.getFacturas(),
      Storage.getGastos(),
      Storage.getInventarioDigital(),
      Storage.getInventarioFisico(),
      Storage.getLicencias()
    ]);

    this.renderKPIs(facturas, gastos, clientes, digital, fisico);
    this.renderCharts(facturas, gastos);
    this.renderAlerts(facturas, fisico, licencias);
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

  renderAlerts(facturas, fisico, licencias) {
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

    const licenciasPorVencer = (licencias || []).filter(l => {
      if (!l.fecha_expiracion) return false;
      const d = new Date(l.fecha_expiracion);
      const diff = (d.getTime() - now.getTime()) / 86400000;
      return diff > 0 && diff <= 30;
    });
    if (licenciasPorVencer.length > 0) {
      alerts.push({ icon: 'warning', bi: 'key', text: `${licenciasPorVencer.length} licencia(s) por vencer`, detail: 'Vencen en 30 dias', badge: licenciasPorVencer.length });
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
      { action: 'new-licencia', bi: 'key', label: 'Nueva Licencia' },
      { action: 'inventory', bi: 'box', label: 'Inventario' },
      { action: 'backup', bi: 'cloud-arrow-up', label: 'Backup' }
    ];

    container.innerHTML = actions.map(a => `
      <div class="quick-action-btn" data-action="${a.action}">
        <i class="bi bi-${a.bi}"></i>
        <span>${a.label}</span>
      </div>
    `).join('');
  }
};
