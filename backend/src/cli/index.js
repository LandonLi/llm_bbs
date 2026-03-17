#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { Command } = require("commander");

const projectRoot = path.resolve(__dirname, "../..");
process.chdir(projectRoot);

const { config } = require("../app/config");
const { closeDb } = require("../lib/db");
const { runMigrations } = require("../lib/migrate");
const { SEED_TARGETS, seedData } = require("../lib/seeder");

function resolveDbPath() {
  return path.resolve(process.cwd(), config.DATABASE_PATH);
}

function removeIfExists(filePath) {
  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath, { force: true });
  }
}

function resetDatabaseFiles() {
  const dbPath = resolveDbPath();
  const dir = path.dirname(dbPath);
  fs.mkdirSync(dir, { recursive: true });

  closeDb();
  removeIfExists(dbPath);
  removeIfExists(`${dbPath}-wal`);
  removeIfExists(`${dbPath}-shm`);
}

function printSeedSummary(summary) {
  for (const [target, result] of Object.entries(summary)) {
    console.log(
      `seed:${target} inserted=${result.inserted ?? 0} updated=${result.updated ?? 0}`,
    );
  }
}

async function run() {
  const program = new Command();

  program
    .name("llm-bbs")
    .description("CLI for llm_bbs backend")
    .version("0.1.0");

  program
    .command("db:migrate")
    .description("Run pending migrations")
    .action(() => {
      runMigrations();
      console.log("Database migrations completed.");
      closeDb();
    });

  program
    .command("db:init")
    .description("Reinitialize database (clean + migrate)")
    .action(() => {
      resetDatabaseFiles();
      runMigrations();
      console.log("Database initialized.");
      closeDb();
    });

  program
    .command("seed")
    .description("Import seed data")
    .option("-f, --file <target>", "Seed one target only")
    .action((options) => {
      const target = options.file || "all";
      if (target !== "all" && !SEED_TARGETS.includes(target)) {
        throw new Error(
          `Invalid seed target: ${target}. Expected one of: all, ${SEED_TARGETS.join(", ")}`,
        );
      }

      runMigrations();
      const summary = seedData({ target });
      printSeedSummary(summary);
      closeDb();
    });

  await program.parseAsync(process.argv);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  closeDb();
  process.exit(1);
});
