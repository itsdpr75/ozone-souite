ConfigTabs.security = function() {
  return `
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
  `;
};

ConfigTabs.securityInit = async function() {
  ConfigTabs.loadLockStatus();
};

ConfigTabs.loadLockStatus = async function() {
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
};
