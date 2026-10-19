// ─────────────────────────────────────────────────────────────────────────────
// Authenticated-user context (Phase 4, Section 8). Populated by the `authenticate`
// pre-handler AFTER re-reading the user's CURRENT status/role from the database —
// never from a token claim alone. Deliberately minimal: no secrets, no tokens.
// ─────────────────────────────────────────────────────────────────────────────
import type { UserRole, UserStatus } from "../../generated/prisma/client";

export interface AuthenticatedUser {
  id: string;
  email: string;
  primaryRole: UserRole;
  status: UserStatus;
}

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}
