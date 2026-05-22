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
      ['InventarioModule', typeof InventarioModule !== 'undefined' ? InventarioModule : null],
      ['LicenciasModule', typeof LicenciasModule !== 'undefined' ? LicenciasModule : null]
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

    Dashboard.update();
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
        case 'new-licencia':
          this.switchModule('licencias');
          setTimeout(() => {
            const newBtn = document.getElementById('btn-new-licencia');
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
      case 'dashboard': Dashboard.update(); break;
      case 'clientes': await ClientesModule.refresh(); break;
      case 'facturas': await FacturasModule.refresh(); break;
      case 'contabilidad': await ContabilidadModule.refresh(); break;
      case 'inventario': await InventarioModule.refresh(); break;
      case 'licencias': await LicenciasModule.refresh(); break;
    }
  },

  async toggleTheme() {
    const newTheme = AppState.config.theme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    try { await Storage.setConfig('theme', newTheme); } catch (e) { console.error(e); }
    AppState.config.theme = newTheme;
    Dashboard.update();
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
