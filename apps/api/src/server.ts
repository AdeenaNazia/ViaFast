// ─────────────────────────────────────────────────────────────────────────────
// Process entry point (Phase 4, Section 2). Importing `./config/env` validates the
// environment eagerly, so a missing/weak production secret or bad DATABASE_URL
// aborts startup with a clear message BEFORE any listener opens. Binds to the
// configured host/port and closes gracefully (disconnecting Prisma) on signals.
// ─────────────────────────────────────────────────────────────────────────────
import { buildApp } from "./app";
import { env } from "./config/env";

async function main(): Promise<void> {
  const app = await buildApp();

  try {
    await app.listen({ host: env.host, port: env.port });
  } catch (error) {
    app.log.error(error, "failed to start HTTP listener");
    await app.close();
    process.exit(1);
  }

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      app.log.info({ signal }, "received shutdown signal");
      void app.close().then(() => process.exit(0));
    });
  }
}

void main();
