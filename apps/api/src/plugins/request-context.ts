// ─────────────────────────────────────────────────────────────────────────────
// Request correlation id. Fastify generates `request.id` (see genReqId in app.ts);
// this echoes it back as `X-Request-Id` on EVERY response (§1.4) so it can be
// included in the error envelope and used for tracing. Client-supplied ids are
// ignored to avoid log-injection.
// ─────────────────────────────────────────────────────────────────────────────
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

export const requestContextPlugin = fp(
  async (app: FastifyInstance) => {
    app.addHook("onSend", async (request, reply, payload) => {
      reply.header("x-request-id", request.id);
      return payload;
    });
  },
  { name: "request-context" },
);
