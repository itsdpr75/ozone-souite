// ============================================================
// helpers.js - Funciones auxiliares de formato y validacion
// ============================================================

// Formatear numero como moneda EUR
function formatCurrency(amount) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount || 0);
}

// Formatear fecha como DD/MM/YYYY
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-ES');
}

// Obtener fecha actual en formato YYYY-MM-DD
function todayISO() {
  return new Date().toISOString().split('T')[0];
}

// Generar ID unico simple
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// Generar numero de factura: FACT-YYYY-XXXX
function generateInvoiceNumber(existingNumbers) {
  const year = new Date().getFullYear();
  const prefix = `FACT-${year}-`;
  let maxNum = 0;
  existingNumbers.forEach(num => {
    if (num.startsWith(prefix)) {
      const parts = num.split('-');
      const n = parseInt(parts[2], 10);
      if (n > maxNum) maxNum = n;
    }
  });
  const nextNum = String(maxNum + 1).padStart(4, '0');
  return `${prefix}${nextNum}`;
}

// Validar email basico
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Validar NIF/CIF espanol (basico)
function isValidNIF(nif) {
  return /^[0-9XYZ][0-9]{7}[A-Z]$/.test(nif.toUpperCase());
}

// Validar que un campo no este vacio
function isNotEmpty(value) {
  return value && value.trim().length > 0;
}

// Escapar HTML para prevenir XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Mostrar notificacion toast
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Abrir modal con contenido HTML
function openModal(title, htmlContent) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = htmlContent;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

// Cerrar modal
function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.getElementById('modal-body').innerHTML = '';
}

// Confirmar accion peligrosa
function confirmAction(message) {
  return confirm(message);
}

// Obtener valor de un input de formulario
function getFormValue(formId, fieldName) {
  const el = document.querySelector(`#${formId} [name="${fieldName}"]`);
  return el ? el.value.trim() : '';
}

// Setear valor de un input de formulario
function setFormValue(formId, fieldName, value) {
  const el = document.querySelector(`#${formId} [name="${fieldName}"]`);
  if (el) el.value = value || '';
}

// Tipos de servicio de fotogrametria
const SERVICE_TYPES = [
  'Escaneo exterior',
  'Escaneo interior de objeto',
  'Material PBR',
  'Malla 3D',
  'Mapa de normales',
  'Mapa de rugosidad',
  'Mapa de desplazamiento',
  'Textura Albedo',
  'Proyecto Meshroom',
  'Consultoria fotogrametrica'
];

// Categorias de gastos
const EXPENSE_CATEGORIES = [
  'Hardware',
  'Software',
  'Almacenamiento',
  'Infraestructura',
  'Oficina',
  'Servidores',
  'Electricidad',
  'Internet',
  'Otros'
];

// Estados de inventario fisico
const PHYSICAL_STATES = ['operativo', 'reparacion', 'retirado'];

// Tipos de activo digital
const DIGITAL_TYPES = [
  'Malla 3D',
  'Material PBR',
  'Textura',
  'Mapa de normales',
  'Mapa de rugosidad',
  'Mapa de desplazamiento',
  'Mapa AO',
  'Mapa de cavidad',
  'Mapa especular',
  'Mapa de anisotropia',
  'Mapa metalness',
  'Proyecto Meshroom',
  'Otro'
];
