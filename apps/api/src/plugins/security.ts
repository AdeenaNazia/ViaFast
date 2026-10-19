// ─────────────────────────────────────────────────────────────────────────────
// HTTP security (Phase 4, Section 10): security headers (helmet), an explicit
// CORS allowlist (never '*' with credentials), and rate limiting. The global
// limiter is a coarse backstop; credential routes apply a stricter per-route limit
// via `config.rateLimit`. In-memory store only — no Redis (ADR scope / single node).
// ─────────────────────────────────────────────────────────────────────────────
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { env } from "../config/env";
import { AppError } from "../errors/app-error";

const GLOBAL_RATE_LIMIT_MAX = 300;
const GLOBAL_RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute

export const securityPlugin = fp(
  async (app: FastifyInstance) => {
    await app.register(helmet, { global: true });

    await app.register(cors, {
      // Empty allowlist => CORS disabled (same-origin only). Production requires
      // explicit origins (enforced in config/env.ts); wildcard is forbidden.
      origin: env.corsOrigins.length > 0 ? [...env.corsOrigins] : false,
      credentials: true,
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["authorization", "content-type", "idempotency-key", "if-match"],
      maxAge: 600,
    });

    await app.register(rateLimit, {
      global: true,
      max: GLOBAL_RATE_LIMIT_MAX,
      timeWindow: GLOBAL_RATE_LIMIT_WINDOW_MS,
      // Liveness probes must never be throttled.
      allowList: (req: FastifyRequest) => req.url.split("?")[0] === "/health",
      // @fastify/rate-limit THROWS whatever this returns. Returning an AppError
      // routes it through the centralized handler, producing the standard
      // RATE_LIMITED envelope (§1.4). The plugin already sets the Retry-After
      // header before throwing, so we do not set it again here.
      errorResponseBuilder: (_req: FastifyRequest, context: { after: string }) =>
        AppError.rateLimited(undefined, `Too many requests. Retry after ${context.after}.`),
    });
  },
  { name: "security" },
);
