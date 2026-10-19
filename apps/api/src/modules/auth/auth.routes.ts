// ─────────────────────────────────────────────────────────────────────────────
// Auth endpoints (Phase 4, Section 7). Login and refresh carry a STRICTER
// per-route rate limit than the global backstop (api-contract §10). Logout is
// authenticated and idempotent (204). All request bodies are validated before any
// credential or database work happens.
// ─────────────────────────────────────────────────────────────────────────────
import type { FastifyInstance } from "fastify";
import { env } from "../../config/env";
import { authenticate } from "../../security/guards";
import { parseWith } from "../../validation/validate";
import { loginSchema, logoutSchema, refreshSchema } from "./auth.schemas";
import * as authService from "./auth.service";

const AUTH_RATE_LIMIT = {
  max: env.authRateLimitMax,
  timeWindow: env.authRateLimitWindowMs,
};

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/auth/login",
    { config: { rateLimit: AUTH_RATE_LIMIT } },
    async (request, reply) => {
      const { identifier, password } = parseWith(loginSchema, request.body);
      const result = await authService.login(app.prisma, identifier, password);
      return reply.code(200).send(result);
    },
  );

  app.post(
    "/auth/refresh",
    { config: { rateLimit: AUTH_RATE_LIMIT } },
    async (request, reply) => {
      const { refreshToken } = parseWith(refreshSchema, request.body);
      const result = await authService.refresh(app.prisma, refreshToken);
      return reply.code(200).send(result);
    },
  );

  app.post(
    "/auth/logout",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { refreshToken } = parseWith(logoutSchema, request.body ?? {});
      // request.user is guaranteed by the `authenticate` pre-handler.
      await authService.logout(app.prisma, request.user!.id, refreshToken);
      return reply.code(204).send();
    },
  );
}
