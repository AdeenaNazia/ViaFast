// ─────────────────────────────────────────────────────────────────────────────
// Application factory (Phase 4, Section 2). Builds and returns a fully-configured
// Fastify instance WITHOUT listening, so tests can drive it via `app.inject()`
// (no real sockets) and `server.ts` can bind it to a port. Cross-cutting concerns
// are registered once, in order: prisma → request-id → security (helmet/cors/rate
// limit) → centralized error handling → routes. Auth/me live under `/api/v1`
// (api-contract §1.1); `/health` is an unversioned infra probe at the root.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "node:crypto";
import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";
import { env } from "./config/env";
import { healthRoutes } from "./modules/health/health.routes";
import { authRoutes } from "./modules/auth/auth.routes";
import { meRoutes } from "./modules/users/me.routes";
import { registerErrorHandling } from "./plugins/error-handler";
import { prismaPlugin } from "./plugins/prisma";
import { requestContextPlugin } from "./plugins/request-context";
import { securityPlugin } from "./plugins/security";

const API_PREFIX = "/api/v1";
const BODY_LIMIT_BYTES = 1_048_576; // 1 MiB — bounds JSON parse / Argon2 input size.

export interface BuildAppOptions {
  /** Override the logger (tests pass `false` to stay silent). Defaults to env.LOG_LEVEL. */
  logger?: FastifyServerOptions["logger"];
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    // Fresh, server-generated correlation id per request; client ids are ignored
    // (see request-context plugin) to avoid log injection.
    genReqId: () => `req_${randomUUID()}`,
    bodyLimit: BODY_LIMIT_BYTES,
    // Conservative: do not trust X-Forwarded-* unless explicitly enabled by env.
    trustProxy: env.trustProxy,
    logger: options.logger ?? { level: env.logLevel },
  });

  await app.register(prismaPlugin);
  await app.register(requestContextPlugin);
  await app.register(securityPlugin);
  registerErrorHandling(app);

  await app.register(healthRoutes);
  await app.register(authRoutes, { prefix: API_PREFIX });
  await app.register(meRoutes, { prefix: API_PREFIX });

  return app;
}
