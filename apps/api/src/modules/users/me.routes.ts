// ─────────────────────────────────────────────────────────────────────────────
// `GET /me` (Phase 4, Section 7). Requires a valid access token; `authenticate`
// re-reads the CURRENT status/role from the DB, so a token for a since-suspended
// or deleted account is rejected here rather than trusted. Returns only safe
// identity + role-profile fields — never passwordHash, never refresh-token rows.
//
// DELIBERATE NARROWING vs api-contract §3: the transport-context fields
// (`activeAssignment`, `currentTripId`, `linkedStudents`) are OMITTED here because
// they require route/trip/assignment queries that Section 13 defers to the
// transport phase. `/me` in this phase answers "who am I", not "what is my ride".
// ─────────────────────────────────────────────────────────────────────────────
import type { FastifyInstance } from "fastify";
import { AppError } from "../../errors/app-error";
import { authenticate } from "../../security/guards";
import { loadUserPrincipal, toPublicUser, type UserPrincipal } from "./users.service";

function shapeMeResponse(principal: UserPrincipal): Record<string, unknown> {
  const body: Record<string, unknown> = {
    user: { ...toPublicUser(principal), status: principal.status },
  };
  if (principal.roleProfile) {
    const { kind, ...profile } = principal.roleProfile;
    body[kind] = profile;
  }
  return body;
}

export async function meRoutes(app: FastifyInstance): Promise<void> {
  app.get("/me", { preHandler: [authenticate] }, async (request, reply) => {
    const principal = await loadUserPrincipal(app.prisma, request.user!.id);
    if (!principal) throw AppError.unauthenticated("Account no longer exists.");
    return reply.code(200).send(shapeMeResponse(principal));
  });
}
