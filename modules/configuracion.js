// ============================================================
// modules/configuracion.js - Panel de configuracion
// General, Backups, Seguridad
// ============================================================

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

        <!-- TAB: General -->
        <div class="config-tab-content active" id="tab-general">
          <div class="form-group">
            <label>Nombre de la Empresa</label>
            <input type="text" id="cfg-company" class="form-input" value="${escapeHtml(companyName)}">
          </div>

          <div class="form-group">
            <label>Logo de la Empresa</label>
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
              ${logoPreview}
              <div style="display:flex;flex-direction:column;gap:6px">
                <button class="btn btn-sm btn-secondary" onclick="ConfigModule.uploadLogo()"><i class="bi bi-upload"></i> Subir Logo</button>
                ${logoPath ? `<button class="btn btn-sm btn-danger" onclick="ConfigModule.clearLogo()"><i class="bi bi-trash3"></i> Quitar</button>` : ''}
              </div>
            </div>
            <label style="font-size:0.75rem;color:var(--text-muted)">Se mostrara en la barra lateral. Formatos: PNG, JPG, SVG, WEBP</label>
          </div>

          <div class="form-group">
            <label>Tema</label>
            <select id="cfg-theme" class="form-select">
              <option value="dark" ${this.config.theme === 'dark' ? 'selected' : ''}>Oscuro</option>
              <option value="light" ${this.config.theme === 'light' ? 'selected' : ''}>Claro</option>
            </select>
          </div>

          <div class="form-group">
            <label>Ruta de la Base de Datos</label>
            <div style="display:flex;gap:8px;margin-bottom:8px">
              <input type="text" id="cfg-db-path" class="form-input" value="${escapeHtml(dbPath)}" readonly style="flex:1">
              <button class="btn btn-sm btn-secondary" onclick="ConfigModule.selectDbDir()"><i class="bi bi-folder2-open"></i></button>
              <button class="btn btn-sm btn-secondary" onclick="ConfigModule.resetDbPath()"><i class="bi bi-arrow-counterclockwise"></i> Reset</button>
            </div>
          </div>

          <div class="form-group">
            <label>Historial de Ubicaciones</label>
            <div id="cfg-location-history" style="max-height:120px;overflow-y:auto;background:var(--input-bg);border-radius:8px;padding:8px">
              <p style="color:var(--text-muted);font-size:0.8rem">Cargando...</p>
            </div>
          </div>

          <div class="form-actions">
            <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
            <button class="btn btn-primary" onclick="ConfigModule.saveGeneral()"><i class="bi bi-check-circle"></i> Guardar</button>
          </div>
        </div>

        <!-- TAB: Interfaz -->
        <div class="config-tab-content" id="tab-interface">
          <div class="form-group">
            <label>Escala de la Interfaz</label>
            <div style="display:flex;align-items:center;gap:16px;margin-top:8px">
              <input type="range" id="cfg-ui-scale" min="80" max="150" step="5" value="${this.config.ui_scale || 100}" style="flex:1">
              <span id="cfg-ui-scale-value" style="font-weight:700;min-width:50px;text-align:center">${this.config.ui_scale || 100}%</span>
            </div>
            <label style="font-size:0.75rem;color:var(--text-muted);margin-top:8px;display:block">Ajusta el tamano de todos los elementos de la interfaz. Se aplica al instante.</label>
          </div>

          <div class="form-actions">
            <button class="btn btn-secondary" onclick="ConfigModule.resetUiScale()"><i class="bi bi-arrow-counterclockwise"></i> Restablecer</button>
            <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
            <button class="btn btn-primary" onclick="ConfigModule.saveInterface()"><i class="bi bi-check-circle"></i> Guardar</button>
          </div>
        </div>

        <!-- TAB: Backups -->
        <div class="config-tab-content" id="tab-backups">
          <div class="form-group">
            <label>Copias de Seguridad Automaticas</label>
            <div style="display:flex;flex-direction:column;gap:12px;margin-top:8px">
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
                <input type="checkbox" id="cfg-backup-open" ${this.config.backup_on_open === 'true' ? 'checked' : ''}>
                <span>Hacer copia al abrir el programa</span>
              </label>
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
                <input type="checkbox" id="cfg-backup-close" ${this.config.backup_on_close === 'true' ? 'checked' : ''}>
                <span>Hacer copia al cerrar el programa</span>
              </label>
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
                <input type="checkbox" id="cfg-backup-periodic" ${this.config.backup_periodic === 'true' ? 'checked' : ''}>
                <span>Copia periodica cada</span>
                <select id="cfg-backup-interval" class="form-select" style="width:auto">
                  <option value="1" ${this.config.backup_interval === '1' ? 'selected' : ''}>1 hora</option>
                  <option value="6" ${this.config.backup_interval === '6' ? 'selected' : ''}>6 horas</option>
                  <option value="12" ${this.config.backup_interval === '12' ? 'selected' : ''}>12 horas</option>
                  <option value="24" ${this.config.backup_interval === '24' ? 'selected' : ''}>24 horas</option>
                </select>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label>Acciones</label>
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">
              <button class="btn btn-sm btn-primary" onclick="ConfigModule.createBackup()"><i class="bi bi-download"></i> Crear Backup ZIP</button>
              <button class="btn btn-sm btn-secondary" onclick="ConfigModule.importBackup()"><i class="bi bi-upload"></i> Importar ZIP</button>
              <button class="btn btn-sm btn-secondary" onclick="ConfigModule.exportCSV()"><i class="bi bi-file-earmark-spreadsheet"></i> Exportar CSV</button>
              <button class="btn btn-sm btn-secondary" onclick="ConfigModule.importCSV()"><i class="bi bi-file-earmark-arrow-up"></i> Importar CSV</button>
            </div>
          </div>

          <div class="form-group">
            <label>Historial de Copias</label>
            <div id="cfg-backup-list" style="max-height:200px;overflow-y:auto">
              <p style="color:var(--text-muted);font-size:0.8rem">Cargando...</p>
            </div>
          </div>

          <div class="form-actions">
            <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
            <button class="btn btn-primary" onclick="ConfigModule.saveBackups()"><i class="bi bi-check-circle"></i> Guardar Config</button>
          </div>
        </div>

        <!-- TAB: Security -->
        <div class="config-tab-content" id="tab-security">
          <div style="padding:16px;background:var(--accent-light);border-radius:8px;margin-bottom:16px">
            <p style="font-size:0.9rem"><i class="bi bi-shield-lock"></i> <strong>Sistema de Bloqueo de Base de Datos</strong></p>
            <p style="font-size:0.8rem;color:var(--text-secondary);margin-top:4px">
              Cuando se abre la aplicacion, se crea un archivo .lock que indica quien esta usando la base de datos.
              Si otro usuario intenta abrir la app, recibira una advertencia.
            </p>
          </div>

          <div class="form-group">
            <label>Estado Actual del Lock</label>
            <div id="cfg-lock-status" style="padding:12px;background:var(--input-bg);border-radius:8px">
              <p style="color:var(--text-muted);font-size:0.8rem">Verificando...</p>
            </div>
          </div>

          <div class="form-actions">
            <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
          </div>
        </div>
      </div>
    `;

    openModal('Configuracion', html);
    this.bindConfigTabs();
    this.loadLocationHistory();
    this.loadBackupList();
    this.loadLockStatus();
    this.loadLogoPreview();
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

  async loadLocationHistory() {
    const history = await Storage.getLocationHistory();
    const container = document.getElementById('cfg-location-history');
    if (!container) return;

    if (history.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);font-size:0.8rem">Sin historial</p>';
      return;
    }

    container.innerHTML = history.map(h => `
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:0.8rem">
        <span style="color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;margin-right:12px">${escapeHtml(h.ruta)}</span>
        <span style="color:var(--text-muted);white-space:nowrap">${formatDate(h.fecha)}</span>
      </div>
    `).join('');
  },

  async loadBackupList() {
    const backups = await Storage.getBackupHistory();
    const container = document.getElementById('cfg-backup-list');
    if (!container) return;

    if (backups.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);font-size:0.8rem">Sin copias de seguridad</p>';
      return;
    }

    container.innerHTML = `
      <table class="data-table" style="font-size:0.8rem">
        <thead><tr><th>Fecha</th><th>Tipo</th><th>Tamano</th><th></th></tr></thead>
        <tbody>
          ${backups.map(b => {
            const size = b.tamano > 1048576 ? (b.tamano / 1048576).toFixed(1) + ' MB' : (b.tamano / 1024).toFixed(0) + ' KB';
            return `<tr>
              <td>${formatDate(b.fecha)}</td>
              <td><span class="badge badge-emitida">${escapeHtml(b.tipo)}</span></td>
              <td>${size}</td>
              <td><button class="btn-icon" onclick="ConfigModule.deleteBackup(${b.id})" title="Eliminar"><i class="bi bi-trash3"></i></button></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    `;
  },

  async loadLockStatus() {
    const container = document.getElementById('cfg-lock-status');
    if (!container) return;

    const lockInfo = await Storage.getLockInfo();
    if (!lockInfo) {
      container.innerHTML = '<p style="color:var(--success);font-size:0.85rem"><i class="bi bi-check-circle"></i> Base de datos desbloqueada</p>';
      return;
    }

    container.innerHTML = `
      <div style="font-size:0.85rem">
        <p><strong>Usuario:</strong> ${escapeHtml(lockInfo.username)}</p>
        <p><strong>Host:</strong> ${escapeHtml(lockInfo.hostname)}</p>
        <p><strong>Abierta:</strong> ${lockInfo.openTimeFormatted}</p>
        <p><strong>Tiempo:</strong> ${lockInfo.timeAgo}</p>
        <p style="color:var(--warning);margin-top:8px"><i class="bi bi-exclamation-triangle"></i> La base de datos esta en uso</p>
      </div>
    `;
  },

  async loadLogoPreview() {
    const preview = document.getElementById('config-logo-preview');
    if (!preview || !preview.dataset.path) return;
    const dataUrl = await Storage.readLogo(preview.dataset.path);
    if (dataUrl) {
      preview.src = dataUrl;
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

  async selectDbDir() {
    const result = await window.electronAPI.openDirectory();
    if (result.canceled || result.filePaths.length === 0) return;

    const dir = result.filePaths[0];
    const newPath = dir.endsWith('.db') ? dir : require('path').join(dir, 'ozone-souite.db');
    document.getElementById('cfg-db-path').value = newPath;
  },

  async resetDbPath() {
    const defaultDir = await Storage.getDefaultDir();
    document.getElementById('cfg-db-path').value = require('path').join(defaultDir, 'ozone-souite.db');
  },

  async saveGeneral() {
    const theme = document.getElementById('cfg-theme').value;
    const company = document.getElementById('cfg-company').value.trim() || 'Ozone Souite';
    const dbPath = document.getElementById('cfg-db-path').value.trim();

    await Storage.setConfig('theme', theme);
    await Storage.setConfig('company_name', company);

    // Verificar si la ruta de DB cambio
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

    // Aplicar tema
    applyTheme(theme);
    await Storage.setConfig('theme', theme);
  },

  async createBackup() {
    showToast('Creando backup...', 'info');
    const result = await Storage.createZipBackup();
    if (result) {
      showToast('Backup creado: ' + result.path, 'success');
      this.loadBackupList();
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
    this.loadBackupList();
    showToast('Backup eliminado', 'info');
  },

  async saveBackups() {
    await Storage.setConfig('backup_on_open', document.getElementById('cfg-backup-open').checked ? 'true' : 'false');
    await Storage.setConfig('backup_on_close', document.getElementById('cfg-backup-close').checked ? 'true' : 'false');
    await Storage.setConfig('backup_periodic', document.getElementById('cfg-backup-periodic').checked ? 'true' : 'false');
    await Storage.setConfig('backup_interval', document.getElementById('cfg-backup-interval').value);

    showToast('Configuracion de backups guardada', 'success');
    closeModal();
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
