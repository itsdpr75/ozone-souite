const path = require('path');
const os = require('os');

const DEFAULT_DB_DIR = path.join(os.homedir(), '.config', 'ozone-souite');
const DEFAULT_DB_PATH = path.join(DEFAULT_DB_DIR, 'ozone-souite.db');

function getDefaultDir() {
  return DEFAULT_DB_DIR;
}

function getDefaultPath() {
  return DEFAULT_DB_PATH;
}

function createSchema(db) {
  db.run(`
    CREATE TABLE IF NOT EXISTS clientes (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      nif TEXT NOT NULL,
      email TEXT NOT NULL,
      telefono TEXT DEFAULT '',
      direccion TEXT DEFAULT '',
      notas TEXT DEFAULT '',
      orders TEXT DEFAULT '[]',
      documents TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS facturas (
      id TEXT PRIMARY KEY,
      numero TEXT UNIQUE NOT NULL,
      cliente_id TEXT REFERENCES clientes(id),
      fecha TEXT NOT NULL,
      lineas TEXT DEFAULT '[]',
      subtotal REAL DEFAULT 0,
      iva REAL DEFAULT 21,
      total REAL DEFAULT 0,
      estado TEXT DEFAULT 'emitida',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS gastos (
      id TEXT PRIMARY KEY,
      concepto TEXT NOT NULL,
      importe REAL NOT NULL,
      fecha TEXT NOT NULL,
      categoria TEXT DEFAULT 'Otros',
      notas TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS inventario_fisico (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      cantidad INTEGER DEFAULT 1,
      ubicacion TEXT DEFAULT '',
      estado TEXT DEFAULT 'operativo',
      ultima_revision TEXT DEFAULT '',
      descripcion TEXT DEFAULT '',
      prestamos TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS inventario_digital (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      tipo_activo TEXT NOT NULL,
      tamano REAL DEFAULT 0,
      cliente TEXT DEFAULT '',
      fecha_creacion TEXT DEFAULT '',
      ruta TEXT DEFAULT '',
      descripcion TEXT DEFAULT '',
      estado TEXT DEFAULT 'activo',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS licencias (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      proveedor TEXT DEFAULT '',
      version TEXT DEFAULT '',
      categoria TEXT DEFAULT 'General',
      tipo TEXT DEFAULT 'subscription',
      clave TEXT DEFAULT '',
      fecha_inicio TEXT DEFAULT '',
      fecha_expiracion TEXT DEFAULT '',
      coste REAL DEFAULT 0,
      asientos INTEGER DEFAULT 1,
      auto_renovacion INTEGER DEFAULT 0,
      estado TEXT DEFAULT 'activa',
      notas TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS backups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL,
      ruta TEXT NOT NULL,
      tipo TEXT NOT NULL,
      tamano INTEGER DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS location_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ruta TEXT NOT NULL,
      fecha TEXT NOT NULL
    )
  `);
}

function seedDefaults(db, dbPath) {
  const defaults = [
    ['theme', 'dark'],
    ['db_path', dbPath],
    ['logo_path', ''],
    ['backup_on_open', 'true'],
    ['backup_on_close', 'true'],
    ['backup_periodic', 'false'],
    ['backup_interval', '24'],
    ['company_name', 'Ozone Souite']
  ];

  const stmt = db.prepare('INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)');
  for (const [key, value] of defaults) {
    stmt.run([key, String(value)]);
  }
  stmt.free();
}

module.exports = { DEFAULT_DB_DIR, DEFAULT_DB_PATH, getDefaultDir, getDefaultPath, createSchema, seedDefaults };
