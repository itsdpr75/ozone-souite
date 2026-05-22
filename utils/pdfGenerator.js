// ============================================================
// pdfGenerator.js - Generacion de PDFs para facturas
// ============================================================

const PDFGenerator = {
  generateInvoiceHTML(factura, cliente) {
    let lineas = factura.lineas;
    if (typeof lineas === 'string') {
      try { lineas = JSON.parse(lineas); } catch (e) { lineas = []; }
    }

    const subtotal = lineas.reduce((sum, l) => sum + (l.cantidad * l.precioUnitario), 0);
    const iva = subtotal * (factura.iva / 100);
    const total = subtotal + iva;

    const lineasHTML = lineas.map(l => `
      <tr>
        <td>${escapeHtml(l.concepto)}</td>
        <td style="text-align:center">${l.cantidad}</td>
        <td style="text-align:right">${formatCurrency(l.precioUnitario)}</td>
        <td style="text-align:right">${formatCurrency(l.cantidad * l.precioUnitario)}</td>
      </tr>
    `).join('');

    return `
      <div class="invoice-preview">
        <div class="inv-header">
          <div>
            <h2>FACTURA</h2>
            <p style="color:#666;font-size:0.9rem">${escapeHtml(factura.numero)}</p>
          </div>
          <div style="text-align:right">
            <p style="font-weight:700;font-size:1.1rem;color:#1a1a2e">${escapeHtml(AppState.config.company_name || 'Ozone Souite')}</p>
            <p style="color:#666;font-size:0.85rem">Fotogrametria y Activos 3D</p>
          </div>
        </div>
        <div class="inv-info">
          <div>
            <p style="font-weight:600;color:#2563eb;margin-bottom:8px">Facturar a:</p>
            <p style="font-weight:600">${escapeHtml(cliente ? cliente.nombre : 'N/A')}</p>
            <p>NIF/CIF: ${escapeHtml(cliente ? cliente.nif : '-')}</p>
            <p>${escapeHtml(cliente ? cliente.email : '-')}</p>
            <p>${escapeHtml(cliente ? cliente.direccion || '' : '')}</p>
          </div>
          <div style="text-align:right">
            <p style="font-weight:600;color:#2563eb;margin-bottom:8px">Detalles:</p>
            <p>Fecha: ${formatDate(factura.fecha)}</p>
            <p>Estado: <strong>${escapeHtml(factura.estado)}</strong></p>
          </div>
        </div>
        <table>
          <thead><tr><th>Concepto</th><th style="text-align:center">Cantidad</th><th style="text-align:right">Precio Unit.</th><th style="text-align:right">Total</th></tr></thead>
          <tbody>${lineasHTML}</tbody>
        </table>
        <div class="inv-totals">
          <p>Subtotal: <strong>${formatCurrency(subtotal)}</strong></p>
          <p>IVA (${factura.iva}%): <strong>${formatCurrency(iva)}</strong></p>
          <p class="total-final">TOTAL: ${formatCurrency(total)}</p>
        </div>
      </div>
    `;
  },

  previewInvoice(factura, cliente) {
    const html = this.generateInvoiceHTML(factura, cliente);
    openModal('Previsualizacion de Factura', html + `
      <div class="form-actions">
        <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
        <button class="btn btn-primary" onclick="PDFGenerator.printInvoice('${factura.id}')"><i class="bi bi-printer"></i> Imprimir / PDF</button>
      </div>
    `);
  },

  printInvoice(facturaId) {
    const facturas = JSON.parse(localStorage.getItem('facturas_cache') || '[]');
    const clientes = JSON.parse(localStorage.getItem('clientes_cache') || '[]');
    const factura = facturas.find(f => f.id === facturaId);
    const cliente = factura ? clientes.find(c => c.id === factura.cliente_id) : null;

    if (!factura) { showToast('Factura no encontrada', 'error'); return; }

    const printArea = document.getElementById('print-area');
    printArea.innerHTML = this.generateInvoiceHTML(factura, cliente);
    printArea.style.display = 'block';
    closeModal();

    setTimeout(() => {
      window.print();
      setTimeout(() => { printArea.style.display = 'none'; printArea.innerHTML = ''; }, 500);
    }, 200);
  }
};
