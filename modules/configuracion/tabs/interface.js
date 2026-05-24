ConfigTabs.interface = function(config) {
  return `
    <div class="form-group">
      <label>Escala de la Interfaz</label>
      <div style="display:flex;align-items:center;gap:16px;margin-top:8px">
        <input type="range" id="cfg-ui-scale" min="80" max="150" step="5" value="${config.ui_scale || 100}" style="flex:1">
        <span id="cfg-ui-scale-value" style="font-weight:700;min-width:50px;text-align:center">${config.ui_scale || 100}%</span>
      </div>
      <label style="font-size:0.75rem;color:var(--text-muted);margin-top:8px;display:block">Ajusta el tamano de todos los elementos de la interfaz. Se aplica al instante.</label>
    </div>

    <div class="form-actions">
      <button class="btn btn-secondary" onclick="ConfigModule.resetUiScale()"><i class="bi bi-arrow-counterclockwise"></i> Restablecer</button>
      <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
      <button class="btn btn-primary" onclick="ConfigModule.saveInterface()"><i class="bi bi-check-circle"></i> Guardar</button>
    </div>
  `;
};
