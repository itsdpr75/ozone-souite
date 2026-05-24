const ConfigModule = {
  config: {},

  async init() {
    this.config = await Storage.getConfigAll() || {};
  },

  async showConfigPanel() {
    this.config = await Storage.getConfigAll();
    const logoPath = this.config.logo_path || '';
    const logoPreview = logoPath ? `<img src="" id="config-logo-preview" data-path="${escapeHtml(logoPath)}" style="max-width:120px;max-height:60px;border-radius:8px;border:1px solid var(--border);">` : '<div id="config-logo-preview" style="width:120px;height:60px;background:var(--bg-tertiary);border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:0.8rem;">Sin logo</div>';
    const dbPath = await Storage.getDbPath();
    const companyName = this.config.company_name || 'Ozone Souite';

    const html = `
      <div class="config-tabs">
        <div class="config-tab-bar">
          <button class="config-tab active" data-tab="general"><i class="bi bi-gear"></i> General</button>
          <button class="config-tab" data-tab="interface"><i class="bi bi-display"></i> Interfaz</button>
          <button class="config-tab" data-tab="backups"><i class="bi bi-hdd"></i> Copias de Seguridad</button>
          <button class="config-tab" data-tab="security"><i class="bi bi-shield-lock"></i> Seguridad</button>
        </div>

        <div class="config-tab-content active" id="tab-general">
          ${ConfigTabs.general(this.config, companyName, logoPreview, dbPath)}
        </div>

        <div class="config-tab-content" id="tab-interface">
          ${ConfigTabs.interface(this.config)}
        </div>

        <div class="config-tab-content" id="tab-backups">
          ${ConfigTabs.backups(this.config)}
        </div>

        <div class="config-tab-content" id="tab-security">
          ${ConfigTabs.security()}
        </div>
      </div>
    `;

    openModal('Configuracion', html);
    this.bindConfigTabs();
    ConfigTabs.generalInit(logoPath);
    ConfigTabs.backupsInit();
    ConfigTabs.securityInit();
  },

  bindConfigTabs() {
    document.querySelectorAll('.config-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.config-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.config-tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
      });
    });

    const scaleSlider = document.getElementById('cfg-ui-scale');
    const scaleValue = document.getElementById('cfg-ui-scale-value');
    if (scaleSlider && scaleValue) {
      scaleSlider.addEventListener('input', () => {
        scaleValue.textContent = scaleSlider.value + '%';
        document.body.style.zoom = scaleSlider.value + '%';
      });
    }
  },

  async uploadLogo() {
    const result = await Storage.uploadLogo();
    if (result) {
      showToast('Logo subido correctamente', 'success');
      this.showConfigPanel();
    }
  },

  async clearLogo() {
    await Storage.clearLogo();
    showToast('Logo eliminado', 'info');
    this.showConfigPanel();
  },

  async saveGeneral() {
    const theme = document.getElementById('cfg-theme').value;
    const company = document.getElementById('cfg-company').value.trim() || 'Ozone Souite';
    const dbPath = document.getElementById('cfg-db-path').value.trim();

    await Storage.setConfig('theme', theme);
    await Storage.setConfig('company_name', company);

    const currentPath = await Storage.getDbPath();
    if (dbPath !== currentPath) {
      const moveData = confirm('¿Deseas mover la base de datos existente al nuevo directorio?\n\nSi cancelas, se creara una base de datos vacia en la nueva ubicacion.');
      const result = await Storage.migrateDb(dbPath, moveData);
      if (result.success) {
        showToast('Ruta de base de datos actualizada', 'success');
      } else {
        showToast('Error al cambiar la ruta', 'error');
        return;
      }
    }

    showToast('Configuracion guardada', 'success');
    closeModal();
    applyTheme(theme);
    await Storage.setConfig('theme', theme);
  },

  async saveInterface() {
    const scale = document.getElementById('cfg-ui-scale').value;
    await Storage.setConfig('ui_scale', scale);
    showToast('Escala de interfaz guardada', 'success');
    closeModal();
  },

  resetUiScale() {
    const slider = document.getElementById('cfg-ui-scale');
    const value = document.getElementById('cfg-ui-scale-value');
    if (slider && value) {
      slider.value = 100;
      value.textContent = '100%';
      document.body.style.zoom = '100%';
    }
  },

  async saveBackups() {
    await Storage.setConfig('backup_on_open', document.getElementById('cfg-backup-open').checked ? 'true' : 'false');
    await Storage.setConfig('backup_on_close', document.getElementById('cfg-backup-close').checked ? 'true' : 'false');
    await Storage.setConfig('backup_periodic', document.getElementById('cfg-backup-periodic').checked ? 'true' : 'false');
    await Storage.setConfig('backup_interval', document.getElementById('cfg-backup-interval').value);
    showToast('Configuracion de backups guardada', 'success');
    closeModal();
  },

  async createBackup() {
    showToast('Creando backup...', 'info');
    const result = await Storage.createZipBackup();
    if (result) {
      showToast('Backup creado: ' + result.path, 'success');
      ConfigTabs.backupsInit();
    }
  },

  async importBackup() {
    const result = await window.electronAPI.openBackupFile();
    if (result.canceled || result.filePaths.length === 0) return;
    const filePath = result.filePaths[0];
    if (!filePath.endsWith('.zip')) {
      showToast('Selecciona un archivo ZIP', 'error');
      return;
    }
    showToast('Importando backup...', 'info');
    const importResult = await Storage.importZipBackup(filePath);
    if (importResult.success) {
      showToast('Backup importado correctamente', 'success');
    }
  },

  async exportCSV() {
    showToast('Exportando a CSV...', 'info');
    const result = await Storage.exportCSV();
    if (result) {
      showToast('CSV exportado: ' + result.path, 'success');
    }
  },

  async importCSV() {
    const result = await window.electronAPI.openBackupFile();
    if (result.canceled || result.filePaths.length === 0) return;
    const filePath = result.filePaths[0];
    if (!filePath.endsWith('.zip') && !filePath.endsWith('.csv')) {
      showToast('Selecciona un archivo ZIP o CSV', 'error');
      return;
    }
    showToast('Importando CSV...', 'info');
    const importResult = await Storage.importCSV(filePath);
    showToast(`Importados ${importResult.imported} registros`, 'success');
  },

  async deleteBackup(id) {
    if (!confirmAction('¿Eliminar esta copia de seguridad?')) return;
    await Storage.deleteBackup(id);
    ConfigTabs.backupsInit();
    showToast('Backup eliminado', 'info');
  },

  showInfoPanel() {
    const html = `
      <div style="text-align:center;padding:20px">
        <h2 style="color:var(--accent);margin-bottom:8px">Ozone Souite</h2>
        <p style="color:var(--text-secondary);margin-bottom:24px">Sistema de Gestion Empresarial para Fotogrametria</p>

        <div style="text-align:left;background:var(--input-bg);padding:20px;border-radius:12px;margin-bottom:20px">
          <p style="margin-bottom:12px"><strong>Version:</strong> 1.0.0</p>
          <p style="margin-bottom:12px"><strong>Tecnologia:</strong> Electron 37 + SQLite</p>
          <p style="margin-bottom:12px"><strong>Motor de BD:</strong> SQLite (sql.js)</p>
          <p style="margin-bottom:12px"><strong>Almacenamiento:</strong> Local (SQLite)</p>
        </div>

        <div style="text-align:left;background:var(--input-bg);padding:20px;border-radius:12px;margin-bottom:20px">
          <h4 style="margin-bottom:12px">Modulos</h4>
          <ul style="list-style:none;padding:0;font-size:0.9rem;color:var(--text-secondary)">
            <li style="padding:4px 0"><i class="bi bi-grid" style="color:var(--accent)"></i> Panel de Control</li>
            <li style="padding:4px 0"><i class="bi bi-people" style="color:var(--accent)"></i> Gestion de Clientes</li>
            <li style="padding:4px 0"><i class="bi bi-receipt" style="color:var(--accent)"></i> Gestion de Facturas</li>
            <li style="padding:4px 0"><i class="bi bi-graph-up" style="color:var(--accent)"></i> Contabilidad</li>
            <li style="padding:4px 0"><i class="bi bi-box" style="color:var(--accent)"></i> Inventario Fisico y Digital</li>
            <li style="padding:4px 0"><i class="bi bi-key" style="color:var(--accent)"></i> Gestion de Licencias</li>
          </ul>
        </div>

        <p style="font-size:0.8rem;color:var(--text-muted)">
          Desarrollado con HTML, CSS y JavaScript puro.<br>
          Sin frameworks externos.
        </p>
      </div>
    `;
    openModal('Informacion', html);
  }
};
