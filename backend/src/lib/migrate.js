const fs = require("node:fs");
const path = require("node:path");
const { getDb } = require("./db");

const MIGRATIONS_TABLE = "_migrations";

function ensureMigrationsTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
  `);
}

function listMigrationFiles() {
  const dir = path.resolve(process.cwd(), "migrations");
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));
}

function runMigrations() {
  const db = getDb();
  ensureMigrationsTable(db);

  const appliedRows = db
    .prepare(`SELECT filename FROM ${MIGRATIONS_TABLE}`)
    .all();
  const applied = new Set(appliedRows.map((row) => row.filename));
  const migrationFiles = listMigrationFiles();

  for (const filename of migrationFiles) {
    if (applied.has(filename)) {
      continue;
    }

    const absoluteFile = path.resolve(process.cwd(), "migrations", filename);
    const sql = fs.readFileSync(absoluteFile, "utf8");
    const apply = db.transaction(() => {
      db.exec(sql);
      db.prepare(`INSERT INTO ${MIGRATIONS_TABLE} (filename) VALUES (?)`).run(filename);
    });

    apply();
  }
}

module.exports = {
  runMigrations,
};
