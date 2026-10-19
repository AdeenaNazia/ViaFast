// Prisma 7 CLI configuration.
// The datasource URL and seed command live here (Prisma 7 convention), NOT in the
// schema. `dotenv/config` loads ./apps/api/.env so no secret is hard-coded.
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // Runs via `prisma db seed`. tsx executes the TypeScript seed directly (ESM).
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
