import { execSync } from "node:child_process";

export default function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url || url.startsWith("file:")) {
    throw new Error(
      "TEST_DATABASE_URL wajib diisi dengan koneksi PostgreSQL untuk menjalankan tes.",
    );
  }
  const env = { ...process.env, DATABASE_URL: url };
  execSync("npx prisma db push --force-reset --skip-generate", {
    env,
    stdio: "pipe",
  });
  execSync("npx tsx prisma/apply-triggers.ts", { env, stdio: "pipe" });
}
