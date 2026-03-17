const Fastify = require("fastify");

function buildServer() {
  const app = Fastify({
    logger: true,
  });

  app.get("/health", async () => {
    return {
      ok: true,
      data: {
        status: "up",
      },
    };
  });

  return app;
}

module.exports = {
  buildServer,
};
