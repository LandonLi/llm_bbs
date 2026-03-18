const fs = require('node:fs');
const path = require('node:path');

function parseEnvFile(content) {
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    env[key] = rawValue;
  }
  return env;
}

function loadEnvFromFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, 'utf8');
  return parseEnvFile(content);
}

function resolveEnv(baseDir) {
  const envFromFile = loadEnvFromFile(path.join(baseDir, '.env'));
  return {
    ...envFromFile,
    ...process.env
  };
}

module.exports = {
  resolveEnv
};
