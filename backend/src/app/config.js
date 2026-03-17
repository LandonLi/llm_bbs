const path = require("node:path");
const { existsSync } = require("node:fs");
const dotenv = require("dotenv");
const { z } = require("zod");

const envPath = path.resolve(process.cwd(), ".env");
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const ConfigSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().min(1).default("127.0.0.1"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DATABASE_PATH: z.string().min(1).default("./data/llm_bbs.db"),
  OPENAI_API_KEY: z.string().optional(),
  ADMIN_API_KEY: z.string().optional(),
});

const parsed = ConfigSchema.safeParse(process.env);
if (!parsed.success) {
  const formatted = JSON.stringify(parsed.error.flatten().fieldErrors, null, 2);
  throw new Error(`Invalid environment variables:\n${formatted}`);
}

module.exports = {
  config: parsed.data,
};
