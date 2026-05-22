// ============================================================
// renderer.js - Logica principal de la interfaz de usuario
// ============================================================

const AppState = {
  currentModule: 'dashboard',
  config: { theme: 'dark' }
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

  updateDashboard() {
    const clientes = JSON.parse(localStorage.getItem('clientes_cache') || '[]');
    const facturas = JSON.parse(localStorage.getItem('facturas_cache') || '[]');
    const gastos = JSON.parse(localStorage.getItem('gastos_cache') || '[]');
    const digital = JSON.parse(localStorage.getItem('digital_cache') || '[]');
    const fisico = JSON.parse(localStorage.getItem('fisico_cache') || '[]');

    const totalFacturado = facturas.reduce((sum, f) => sum + (f.total || 0), 0);
    const totalCobrado = facturas.filter(f => f.estado === 'pagada').reduce((sum, f) => sum + (f.total || 0), 0);
    const totalGastos = gastos.reduce((sum, g) => sum + (g.importe || 0), 0);
    const beneficio = totalCobrado - totalGastos;

    const el = (id) => document.getElementById(id);
    if (el('dash-clientes')) el('dash-clientes').textContent = clientes.length;
    if (el('dash-facturas')) el('dash-facturas').textContent = facturas.length;
    if (el('dash-facturado')) el('dash-facturado').textContent = formatCurrency(totalFacturado);
    if (el('dash-beneficio')) {
      const beneficioEl = el('dash-beneficio');
      beneficioEl.textContent = formatCurrency(beneficio);
      beneficioEl.style.color = beneficio >= 0 ? 'var(--success)' : 'var(--danger)';
    }
    if (el('dash-activos')) el('dash-activos').textContent = digital.length;
    if (el('dash-equipos')) el('dash-equipos').textContent = fisico.length;
  },

  async toggleTheme() {
    const newTheme = AppState.config.theme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    try { await Storage.setConfig('theme', newTheme); } catch (e) { console.error(e); }
    AppState.config.theme = newTheme;
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
