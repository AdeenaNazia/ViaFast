// ─────────────────────────────────────────────────────────────────────────────
// `GET /me` (Phase 4, Section 7; extended by the Student transport phase). Requires
// a valid access token; `authenticate` re-reads the CURRENT status/role from the
// DB, so a token for a since-suspended or deleted account is rejected here rather
// than trusted. Returns only safe identity + role-profile fields — never
// passwordHash, never refresh-token rows.
//
// `activeAssignment` (api-contract §3) is added ONLY for a caller whose linked role
// profile is a `StudentProfile`, and it carries the same four ids the contract
// specifies — no route labels, stop names or trip data. That detail lives in
// `GET /me/ride`; `/me` still answers "who am I", now plus "which assignment is
// mine". The assignment id is resolved server-side from the caller's own user id,
// never from anything the client sends. Guardians/drivers/staff/admins get no
// `activeAssignment` key at all: their transport context is served by the
// separate `/me/children/{id}/ride` and `/admin/*` endpoints, which are out of
// scope here. `loadUserPrincipal` is intentionally untouched so the login
// response (which shares it) does not gain a transport query it does not need.
// ─────────────────────────────────────────────────────────────────────────────
import type { FastifyInstance } from "fastify";
import { AppError } from "../../errors/app-error";
import { authenticate } from "../../security/guards";
import { findActiveAssignmentRef, type ActiveAssignmentRef } from "../student/student.service";
import { loadUserPrincipal, toPublicUser, type UserPrincipal } from "./users.service";

function shapeMeResponse(
  principal: UserPrincipal,
  activeAssignment: ActiveAssignmentRef | null,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    user: { ...toPublicUser(principal), status: principal.status },
  };
  if (principal.roleProfile) {
    const { kind, ...profile } = principal.roleProfile;
    body[kind] = profile;
  }
  if (activeAssignment) body.activeAssignment = activeAssignment;
  return body;
}

export async function meRoutes(app: FastifyInstance): Promise<void> {
  app.get("/me", { preHandler: [authenticate] }, async (request, reply) => {
    const principal = await loadUserPrincipal(app.prisma, request.user!.id);
    if (!principal) throw AppError.unauthenticated("Account no longer exists.");

    const roleProfile = principal.roleProfile;
    const activeAssignment =
      roleProfile?.kind === "student"
        ? await findActiveAssignmentRef(app.prisma, roleProfile.id)
        : null;

    return reply.code(200).send(shapeMeResponse(principal, activeAssignment));
  });
}
