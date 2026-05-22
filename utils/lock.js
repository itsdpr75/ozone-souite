// ============================================================
// utils/lock.js - Sistema de bloqueo de base de datos
// Previene acceso simultaneo con archivo .lock
// ============================================================

const fs = require('fs');
const path = require('path');
const os = require('os');
const { getDefaultDir } = require('../database');

function getLockPath() {
  return path.join(getDefaultDir(), '.lock');
}

function ensureConfigDir() {
  const dir = getDefaultDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function createLock() {
  ensureConfigDir();
  const lockPath = getLockPath();
  const lockData = {
    username: os.userInfo().username,
    hostname: os.hostname(),
    timestamp: new Date().toISOString(),
    pid: process.pid
  };
  fs.writeFileSync(lockPath, JSON.stringify(lockData, null, 2));
  return lockData;
}

function readLock() {
  const lockPath = getLockPath();
  if (!fs.existsSync(lockPath)) return null;
  try {
    const content = fs.readFileSync(lockPath, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    return null;
  }
}

function removeLock() {
  const lockPath = getLockPath();
  if (fs.existsSync(lockPath)) {
    fs.unlinkSync(lockPath);
  }
}

function isLocked() {
  return fs.existsSync(getLockPath());
}

function getLockInfo() {
  const lock = readLock();
  if (!lock) return null;

  const openTime = new Date(lock.timestamp);
  const now = new Date();
  const diffMs = now - openTime;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  let timeAgo;
  if (diffHours > 0) {
    timeAgo = `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''} y ${diffMins % 60} minuto${diffMins % 60 !== 1 ? 's' : ''}`;
  } else {
    timeAgo = `Hace ${diffMins} minuto${diffMins !== 1 ? 's' : ''}`;
  }

  return {
    username: lock.username,
    hostname: lock.hostname,
    openTime: lock.timestamp,
    openTimeFormatted: openTime.toLocaleString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }),
    timeAgo,
    pid: lock.pid
  };
}

module.exports = {
  createLock,
  readLock,
  removeLock,
  isLocked,
  getLockInfo,
  getLockPath
};
