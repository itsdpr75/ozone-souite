ConfigTabs.general = function(config, companyName, logoPreview, dbPath) {
  return `
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
          ${config.logo_path ? `<button class="btn btn-sm btn-danger" onclick="ConfigModule.clearLogo()"><i class="bi bi-trash3"></i> Quitar</button>` : ''}
        </div>
      </div>
      <label style="font-size:0.75rem;color:var(--text-muted)">Se mostrara en la barra lateral. Formatos: PNG, JPG, SVG, WEBP</label>
    </div>

    <div class="form-group">
      <label>Tema</label>
      <select id="cfg-theme" class="form-select">
        <option value="dark" ${config.theme === 'dark' ? 'selected' : ''}>Oscuro</option>
        <option value="light" ${config.theme === 'light' ? 'selected' : ''}>Claro</option>
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
  `;
};

ConfigTabs.generalInit = async function(logoPath) {
  ConfigTabs.loadLocationHistory();
  const preview = document.getElementById('config-logo-preview');
  if (preview && preview.dataset.path) {
    const dataUrl = await Storage.readLogo(preview.dataset.path);
    if (dataUrl) preview.src = dataUrl;
  }
};

ConfigTabs.loadLocationHistory = async function() {
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
};

ConfigTabs.selectDbDir = async function() {
  const result = await window.electronAPI.openDirectory();
  if (result.canceled || result.filePaths.length === 0) return;
  const dir = result.filePaths[0];
  const newPath = dir.endsWith('.db') ? dir : require('path').join(dir, 'ozone-souite.db');
  document.getElementById('cfg-db-path').value = newPath;
};

ConfigTabs.resetDbPath = async function() {
  const defaultDir = await Storage.getDefaultDir();
  document.getElementById('cfg-db-path').value = require('path').join(defaultDir, 'ozone-souite.db');
};
