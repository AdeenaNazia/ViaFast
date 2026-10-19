// ─────────────────────────────────────────────────────────────────────────────
// `GET /health` (Phase 4, Section 7). Minimal liveness probe. `status:"ok"` means
// the API process is running; `database` reports READINESS separately (a trivial
// `SELECT 1`). Exposes no credentials, environment contents, versions, stack
// traces, or infrastructure detail. Exempt from rate limiting (see security plugin).
// ─────────────────────────────────────────────────────────────────────────────
import type { FastifyInstance } from "fastify";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async (_request, reply) => {
    let database: "up" | "down" = "up";
    try {
      await app.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = "down";
    }
    return reply.code(200).send({
      status: "ok",
      database,
      uptimeSeconds: Math.floor(process.uptime()),
    });
  });
}
