ConfigTabs.backups = function(config) {
  return `
    <div class="form-group">
      <label>Copias de Seguridad Automaticas</label>
      <div style="display:flex;flex-direction:column;gap:12px;margin-top:8px">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
          <input type="checkbox" id="cfg-backup-open" ${config.backup_on_open === 'true' ? 'checked' : ''}>
          <span>Hacer copia al abrir el programa</span>
        </label>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
          <input type="checkbox" id="cfg-backup-close" ${config.backup_on_close === 'true' ? 'checked' : ''}>
          <span>Hacer copia al cerrar el programa</span>
        </label>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
          <input type="checkbox" id="cfg-backup-periodic" ${config.backup_periodic === 'true' ? 'checked' : ''}>
          <span>Copia periodica cada</span>
          <select id="cfg-backup-interval" class="form-select" style="width:auto">
            <option value="1" ${config.backup_interval === '1' ? 'selected' : ''}>1 hora</option>
            <option value="6" ${config.backup_interval === '6' ? 'selected' : ''}>6 horas</option>
            <option value="12" ${config.backup_interval === '12' ? 'selected' : ''}>12 horas</option>
            <option value="24" ${config.backup_interval === '24' ? 'selected' : ''}>24 horas</option>
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
  `;
};

ConfigTabs.backupsInit = async function() {
  ConfigTabs.loadBackupList();
};

ConfigTabs.loadBackupList = async function() {
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
};
