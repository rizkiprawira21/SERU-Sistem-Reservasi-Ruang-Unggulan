import { execSync } from "node:child_process";

export default function setup() {
  const env = { ...process.env, DATABASE_URL: "file:./test.db" };
  execSync("npx prisma db push --force-reset --skip-generate", {
    env,
    stdio: "pipe",
  });
  execSync("npx tsx prisma/apply-triggers.ts", { env, stdio: "pipe" });
}
