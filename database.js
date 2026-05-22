// ============================================================
// database.js - Wrapper de SQLite con sql.js (puro JS, sin nativo)
// ============================================================

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const os = require('os');

const DEFAULT_DB_DIR = path.join(os.homedir(), '.config', 'ozone-souite');
const DEFAULT_DB_PATH = path.join(DEFAULT_DB_DIR, 'ozone-souite.db');

let SQL = null;
let db = null;
let dbPath = DEFAULT_DB_PATH;

function getDefaultDir() {
  return DEFAULT_DB_DIR;
}

function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

async function initDatabase(customPath) {
  if (!SQL) {
    SQL = await initSqlJs();
  }

  dbPath = customPath || DEFAULT_DB_PATH;
  const dir = path.dirname(dbPath);
  ensureDirectory(dir);

  try {
    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }
  } catch (e) {
    db = new SQL.Database();
  }

  createSchema();
  seedDefaults();
  saveDatabase();

  return db;
}

function saveDatabase() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

function createSchema() {
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

function seedDefaults() {
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

function getConfig(key) {
  const stmt = db.prepare('SELECT value FROM config WHERE key = ?');
  stmt.bind([key]);
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return row ? row.value : null;
}

function setConfig(key, value) {
  db.run('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', [key, String(value)]);
  saveDatabase();
}

function getAllConfig() {
  const stmt = db.prepare('SELECT key, value FROM config');
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  const config = {};
  rows.forEach(r => { config[r.key] = r.value; });
  return config;
}

function getDb() {
  return db;
}

function getDbPath() {
  return dbPath;
}

function closeDatabase() {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
  }
}

async function migrateDatabase(newPath) {
  const oldPath = dbPath;
  if (oldPath === newPath) return { success: true, moved: false };

  const newDir = path.dirname(newPath);
  ensureDirectory(newDir);

  if (fs.existsSync(oldPath)) {
    const { execSync } = require('child_process');
    try {
      execSync(`rsync -a "${oldPath}" "${newPath}"`, { stdio: 'pipe' });
      if (fs.existsSync(oldPath + '-wal')) {
        execSync(`rsync -a "${oldPath}-wal" "${newPath}-wal"`, { stdio: 'pipe' });
      }
    } catch (e) {
      fs.copyFileSync(oldPath, newPath);
    }
  }

  closeDatabase();
  await initDatabase(newPath);
  setConfig('db_path', newPath);
  db.run('INSERT INTO location_history (ruta, fecha) VALUES (?, datetime("now"))', [newPath]);
  saveDatabase();

  return { success: true, moved: true };
}

// --- CRUD Helpers ---

function insert(table, data) {
  const keys = Object.keys(data);
  const placeholders = keys.map(() => '?').join(', ');
  const values = keys.map(k => {
    const v = data[k];
    return (typeof v === 'object' && v !== null) ? JSON.stringify(v) : v;
  });
  const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
  db.run(sql, values);
  saveDatabase();
}

function update(table, id, data) {
  const keys = Object.keys(data);
  const setClause = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => {
    const v = data[k];
    return (typeof v === 'object' && v !== null) ? JSON.stringify(v) : v;
  });
  const sql = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
  db.run(sql, [...values, id]);
  saveDatabase();
}

function del(table, id) {
  db.run(`DELETE FROM ${table} WHERE id = ?`, [id]);
  saveDatabase();
}

function getAll(table) {
  const stmt = db.prepare(`SELECT * FROM ${table}`);
  const rows = [];
  while (stmt.step()) {
    rows.push(parseJsonFields(stmt.getAsObject()));
  }
  stmt.free();
  return rows;
}

function getById(table, id) {
  const stmt = db.prepare(`SELECT * FROM ${table} WHERE id = ?`);
  stmt.bind([id]);
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return row ? parseJsonFields(row) : null;
}

function parseJsonFields(row) {
  const jsonFields = ['orders', 'documents', 'lineas', 'prestamos'];
  const result = { ...row };
  for (const field of jsonFields) {
    if (result[field] && typeof result[field] === 'string') {
      try { result[field] = JSON.parse(result[field]); } catch (e) { result[field] = []; }
    }
  }
  return result;
}

module.exports = {
  initDatabase,
  closeDatabase,
  migrateDatabase,
  getDb,
  getDbPath,
  getDefaultDir,
  getConfig,
  setConfig,
  getAllConfig,
  insert,
  update,
  del,
  getAll,
  getById
};
