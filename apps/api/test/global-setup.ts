// ─────────────────────────────────────────────────────────────────────────────
// Vitest global setup (runs ONCE in the main process before workers start).
// Creates the isolated `viafast_test` database if absent and applies all versioned
// migrations to it. It connects to the `postgres` maintenance DB using the SAME
// credentials as development but a DIFFERENT database name, and it NEVER touches,
// resets, or drops `viafast_dev` (Section 11). The created database name is a
// hard-coded constant that must contain "test".
// ─────────────────────────────────────────────────────────────────────────────
import "dotenv/config";
import { execFileSync } from "node:child_process";
import { Client } from "pg";

const TEST_DB_NAME = "viafast_test";

function devUrl(): URL {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("global-setup: DATABASE_URL is not set. Copy .env.example to .env.");
  return new URL(raw);
}

function testUrl(dev: URL): string {
  const url = new URL(dev.toString());
  url.pathname = `/${TEST_DB_NAME}`;
  return url.toString();
}

export default async function setup(): Promise<void> {
  if (!/test/i.test(TEST_DB_NAME)) {
    throw new Error("global-setup: refusing to run — test database name must contain 'test'.");
  }
  const dev = devUrl();

  // 1) Create the test database (idempotent) via the maintenance database.
  const maintenance = new URL(dev.toString());
  maintenance.pathname = "/postgres";
  maintenance.search = ""; // drop Prisma-specific params (e.g. ?schema=) for the raw pg client
  const client = new Client({ connectionString: maintenance.toString() });
  await client.connect();
  try {
    const found = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [TEST_DB_NAME]);
    if ((found.rowCount ?? 0) === 0) {
      // CREATE DATABASE cannot be parameterized or run inside a transaction. The
      // name is a fixed constant (never user input), so this is injection-safe.
      await client.query(`CREATE DATABASE "${TEST_DB_NAME}"`);
      process.stderr.write(`[test-setup] created database "${TEST_DB_NAME}"\n`);
    } else {
      process.stderr.write(`[test-setup] database "${TEST_DB_NAME}" already exists\n`);
    }
  } finally {
    await client.end();
  }

  // 2) Apply versioned migrations to the test database only.
  process.stderr.write(`[test-setup] applying migrations to "${TEST_DB_NAME}"...\n`);
  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    cwd: process.cwd(),
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: testUrl(dev) },
    shell: process.platform === "win32",
  });
  process.stderr.write("[test-setup] migrations applied\n");
}
