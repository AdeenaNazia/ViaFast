// ─────────────────────────────────────────────────────────────────────────────
// Vitest configuration (Phase 4, Section 11). Tests run against a DEDICATED
// `viafast_test` database — never `viafast_dev`. The test DATABASE_URL is derived
// from the developer's .env by swapping ONLY the database name, so no credentials
// are hard-coded here. NODE_ENV=test additionally trips the guard in config/env.ts
// that refuses to boot unless the database name contains "test".
// ─────────────────────────────────────────────────────────────────────────────
import "dotenv/config";
import { defineConfig } from "vitest/config";

export const TEST_DB_NAME = "viafast_test";

function resolveTestDatabaseUrl(): string {
  const dev = process.env.DATABASE_URL;
  if (!dev) {
    throw new Error("vitest.config: DATABASE_URL is not set. Copy .env.example to .env first.");
  }
  const url = new URL(dev);
  url.pathname = `/${TEST_DB_NAME}`;
  return url.toString();
}

export default defineConfig({
  test: {
    // Creates + migrates the isolated test database once, before any worker starts.
    globalSetup: ["./test/global-setup.ts"],
    include: ["test/**/*.test.ts"],
    // These are injected into each worker's process.env BEFORE modules load, so
    // config/env.ts (via `dotenv/config`, which never overrides set vars) sees them.
    env: {
      NODE_ENV: "test",
      DATABASE_URL: resolveTestDatabaseUrl(),
      // Test-only signing key (NODE_ENV=test is never production). Keeps token
      // signing deterministic and silences the ephemeral-secret warning.
      ACCESS_TOKEN_SECRET: "test-only-access-secret-not-for-production-000000",
      ACCESS_TOKEN_TTL: "15m",
      REFRESH_TOKEN_TTL: "30d",
      // Low, deterministic limit so scenario 12 can trigger 429 quickly. Each test
      // uses a unique source IP, so functional tests never trip it.
      AUTH_RATE_LIMIT_MAX: "5",
      AUTH_RATE_LIMIT_WINDOW: "1m",
    },
    // Serial execution: the suite shares one database, so no cross-file parallelism.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
