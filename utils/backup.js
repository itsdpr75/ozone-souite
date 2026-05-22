// ============================================================
// utils/backup.js - Sistema de copias de seguridad
// ============================================================

const fs = require('fs');
const path = require('path');
const os = require('os');
const archiver = require('archiver');
const unzipper = require('unzipper');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const { getDb, getDbPath } = require('../database');

const BACKUP_DIR = path.join(os.homedir(), '.config', 'ozone-souite', 'backups');

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

async function createZipBackup() {
  ensureBackupDir();
  const dbPath = getDbPath();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const zipPath = path.join(BACKUP_DIR, `backup-${timestamp}.zip`);

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      const size = fs.statSync(zipPath).size;
      const db = getDb();
      db.run('INSERT INTO backups (fecha, ruta, tipo, tamano) VALUES (?, ?, ?, ?)', [
        new Date().toISOString(), zipPath, 'zip', size
      ]);
      resolve({ path: zipPath, size });
    });

    archive.on('error', reject);
    archive.pipe(output);
    archive.file(dbPath, { name: path.basename(dbPath) });

    const walPath = dbPath + '-wal';
    if (fs.existsSync(walPath)) {
      archive.file(walPath, { name: path.basename(walPath) });
    }
    const shmPath = dbPath + '-shm';
    if (fs.existsSync(shmPath)) {
      archive.file(shmPath, { name: path.basename(shmPath) });
    }

    archive.finalize();
  });
}

async function importZipBackup(zipPath) {
  const dbPath = getDbPath();
  const dbDir = path.dirname(dbPath);

  const directory = await unzipper.Open.file(zipPath);
  for (const entry of directory.files) {
    const dest = path.join(dbDir, entry.path);
    const writeStream = fs.createWriteStream(dest);
    await entry.stream().pipe(writeStream);
  }

  return { success: true };
}

async function exportToCSV() {
  ensureBackupDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const exportDir = path.join(BACKUP_DIR, `csv-export-${timestamp}`);
  fs.mkdirSync(exportDir, { recursive: true });

  const tables = ['clientes', 'facturas', 'gastos', 'inventario_fisico', 'inventario_digital'];
  const db = getDb();
  const files = [];

  for (const table of tables) {
    const stmt = db.prepare(`SELECT * FROM ${table}`);
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    if (rows.length === 0) continue;

    const headers = Object.keys(rows[0]);
    const csvContent = stringify(rows, { header: true, columns: headers });
    const filePath = path.join(exportDir, `${table}.csv`);
    fs.writeFileSync(filePath, csvContent);
    files.push(filePath);
  }

  const zipPath = path.join(BACKUP_DIR, `csv-export-${timestamp}.zip`);
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(output);

  for (const file of files) {
    archive.file(file, { name: path.basename(file) });
  }

  await new Promise((resolve, reject) => {
    output.on('close', resolve);
    archive.on('error', reject);
    archive.finalize();
  });

  for (const file of files) {
    fs.unlinkSync(file);
  }
  fs.rmdirSync(exportDir);

  return { path: zipPath };
}

async function importFromCSV(csvZipPath) {
  const db = getDb();
  const tempDir = path.join(BACKUP_DIR, 'csv-import-temp');
  fs.mkdirSync(tempDir, { recursive: true });

  const directory = await unzipper.Open.file(csvZipPath);
  for (const entry of directory.files) {
    const dest = path.join(tempDir, entry.path);
    const writeStream = fs.createWriteStream(dest);
    await entry.stream().pipe(writeStream);
  }

  const files = fs.readdirSync(tempDir).filter(f => f.endsWith('.csv'));
  let imported = 0;

  for (const file of files) {
    const table = file.replace('.csv', '');
    const csvContent = fs.readFileSync(path.join(tempDir, file), 'utf8');
    const records = parse(csvContent, { columns: true, skip_empty_lines: true });

    for (const record of records) {
      const keys = Object.keys(record);
      const placeholders = keys.map(() => '?').join(', ');
      const values = keys.map(k => record[k]);
      try {
        db.run(`INSERT OR REPLACE INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`, values);
        imported++;
      } catch (e) {
        console.error(`Error importing to ${table}:`, e.message);
      }
    }
  }

  for (const file of files) {
    fs.unlinkSync(path.join(tempDir, file));
  }
  fs.rmdirSync(tempDir);

  return { imported };
}

function getBackupHistory() {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM backups ORDER BY fecha DESC');
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function deleteBackup(id) {
  const db = getDb();
  const stmt = db.prepare('SELECT ruta FROM backups WHERE id = ?');
  stmt.bind([id]);
  const backup = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();

  if (backup && fs.existsSync(backup.ruta)) {
    fs.unlinkSync(backup.ruta);
  }
  db.run('DELETE FROM backups WHERE id = ?', [id]);
}

async function runAutoBackup(type) {
  try {
    const result = await createZipBackup();
    console.log(`Auto backup (${type}) created: ${result.path}`);
    return result;
  } catch (e) {
    console.error(`Auto backup (${type}) failed:`, e.message);
    return null;
  }
}

module.exports = {
  createZipBackup,
  importZipBackup,
  exportToCSV,
  importFromCSV,
  getBackupHistory,
  deleteBackup,
  runAutoBackup,
  BACKUP_DIR
};
