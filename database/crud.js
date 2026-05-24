const JSON_FIELDS = ['orders', 'documents', 'lineas', 'prestamos'];

function insert(db, saveDb, table, data) {
  const keys = Object.keys(data);
  const placeholders = keys.map(() => '?').join(', ');
  const values = keys.map(k => {
    const v = data[k];
    return (typeof v === 'object' && v !== null) ? JSON.stringify(v) : v;
  });
  const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
  db.run(sql, values);
  saveDb();
}

function update(db, saveDb, table, id, data) {
  const keys = Object.keys(data);
  const setClause = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => {
    const v = data[k];
    return (typeof v === 'object' && v !== null) ? JSON.stringify(v) : v;
  });
  const sql = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
  db.run(sql, [...values, id]);
  saveDb();
}

function del(db, saveDb, table, id) {
  db.run(`DELETE FROM ${table} WHERE id = ?`, [id]);
  saveDb();
}

function getAll(db, table) {
  const stmt = db.prepare(`SELECT * FROM ${table}`);
  const rows = [];
  while (stmt.step()) {
    rows.push(parseJsonFields(stmt.getAsObject()));
  }
  stmt.free();
  return rows;
}

function getById(db, table, id) {
  const stmt = db.prepare(`SELECT * FROM ${table} WHERE id = ?`);
  stmt.bind([id]);
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return row ? parseJsonFields(row) : null;
}

function parseJsonFields(row) {
  const result = { ...row };
  for (const field of JSON_FIELDS) {
    if (result[field] && typeof result[field] === 'string') {
      try { result[field] = JSON.parse(result[field]); } catch (e) { result[field] = []; }
    }
  }
  return result;
}

module.exports = { insert, update, del, getAll, getById };
