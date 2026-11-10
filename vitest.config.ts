import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vitest/config";

function readEnvFile(file: string): Record<string, string> {
  if (!fs.existsSync(file)) return {};
  const values: Record<string, string> = {};
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) values[match[1]] = match[2].replace(/^"|"$/g, "");
  }
  return values;
}

const fileEnv = readEnvFile(".env.test");
const testDbUrl =
  process.env.TEST_DATABASE_URL ??
  fileEnv.TEST_DATABASE_URL ??
  fileEnv.DATABASE_URL;

if (!testDbUrl || testDbUrl.startsWith("file:")) {
  throw new Error(
    "TEST_DATABASE_URL PostgreSQL wajib diisi di .env.test atau environment.",
  );
}

process.env.TEST_DATABASE_URL = testDbUrl;

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
  test: {
    environment: "node",
    globalSetup: ["./tests/global-setup.ts"],
    env: {
      DATABASE_URL: testDbUrl,
      NODE_ENV: "test",
    },
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 60000,
    include: ["tests/**/*.test.ts"],
  },
});
