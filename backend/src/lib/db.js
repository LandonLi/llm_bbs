const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");
const { config } = require("../app/config");

let dbInstance = null;

function ensureDatabaseDir(dbPath) {
  const absolutePath = path.resolve(process.cwd(), dbPath);
  const dir = path.dirname(absolutePath);
  fs.mkdirSync(dir, { recursive: true });
  return absolutePath;
}

function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = ensureDatabaseDir(config.DATABASE_PATH);
  const db = new Database(dbPath);
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");

  dbInstance = db;
  return dbInstance;
}

function closeDb() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

module.exports = {
  getDb,
  closeDb,
};
