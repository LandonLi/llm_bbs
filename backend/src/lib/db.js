const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

function ensureParentDir(filePath) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

function openDatabase(databasePath) {
  const absolutePath = path.resolve(databasePath);
  ensureParentDir(absolutePath);
  const db = new Database(absolutePath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = OFF');
  return db;
}

module.exports = {
  openDatabase
};
