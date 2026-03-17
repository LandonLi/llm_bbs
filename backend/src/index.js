const { config } = require("./app/config");
const { buildServer } = require("./app/server");
const { closeDb } = require("./lib/db");
const { runMigrations } = require("./lib/migrate");

async function main() {
  runMigrations();

  const app = buildServer();

  const close = async () => {
    await app.close();
    closeDb();
  };

  process.on("SIGINT", () => {
    close().finally(() => process.exit(0));
  });
  process.on("SIGTERM", () => {
    close().finally(() => process.exit(0));
  });

  await app.listen({
    host: config.HOST,
    port: config.PORT,
  });
}

main().catch((error) => {
  console.error(error);
  closeDb();
  process.exit(1);
});
