#!/usr/bin/env node
const path = require('node:path');
const { resolveEnv } = require('../lib/env');
const { openDatabase } = require('../lib/db');
const { loadConfig } = require('../app/config');
const { runDbInit } = require('./commands/dbInit');
const { runSeed } = require('./commands/seed');

function printHelp() {
  console.log('Usage: node src/cli/index.js <db:init|seed>');
}

function main() {
  const command = process.argv[2];
  if (!command) {
    printHelp();
    process.exit(1);
  }

  const baseDir = path.resolve(__dirname, '../..');
  const env = resolveEnv(baseDir);
  const config = loadConfig(env);
  const db = openDatabase(path.resolve(baseDir, config.databasePath));

  try {
    if (command === 'db:init') {
      runDbInit(db);
      console.log(`Database initialized at ${path.resolve(baseDir, config.databasePath)}`);
      return;
    }

    if (command === 'seed') {
      runDbInit(db);
      const result = runSeed(db, path.join(baseDir, 'seed'));
      console.log(`Seed import complete. threads=${result.threads}, posts=${result.posts}`);
      return;
    }

    printHelp();
    process.exit(1);
  } finally {
    db.close();
  }
}

main();
