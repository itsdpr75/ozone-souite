const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const { getDefaultDir, getDefaultPath, createSchema, seedDefaults } = require('./schema');
const { insert, update, del, getAll, getById } = require('./crud');

let SQL = null;
let db = null;
let dbPath = getDefaultPath();

function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function saveDatabase() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

async function initDatabase(customPath) {
  if (!SQL) {
    SQL = await initSqlJs();
  }

  dbPath = customPath || getDefaultPath();
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

  createSchema(db);
  seedDefaults(db, dbPath);
  saveDatabase();

  return db;
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

module.exports = {
  initDatabase,
  closeDatabase,
  migrateDatabase,
  getDb,
  getDbPath,
  getDefaultDir,
  getDefaultPath,
  getConfig,
  setConfig,
  getAllConfig,
  insert: (table, data) => insert(db, saveDatabase, table, data),
  update: (table, id, data) => update(db, saveDatabase, table, id, data),
  del: (table, id) => del(db, saveDatabase, table, id),
  getAll: (table) => getAll(db, table),
  getById: (table, id) => getById(db, table, id)
};
