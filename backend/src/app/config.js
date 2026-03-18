const DEFAULT_PORT = 3005;
const DEFAULT_HOST = '127.0.0.1';

function parsePort(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_PORT;
  }
  return parsed;
}

function loadConfig(env = process.env) {
  return {
    host: env.HOST || DEFAULT_HOST,
    port: parsePort(env.PORT),
    databasePath: env.DATABASE_PATH || './data/llm_bbs.db',
    openaiApiKey: env.OPENAI_API_KEY || '',
    adminApiKey: env.ADMIN_API_KEY || ''
  };
}

module.exports = {
  DEFAULT_PORT,
  DEFAULT_HOST,
  loadConfig
};
