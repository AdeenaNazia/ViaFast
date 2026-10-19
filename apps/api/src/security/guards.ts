// ─────────────────────────────────────────────────────────────────────────────
// Authentication + authorization helpers (Phase 4, Section 8).
//   • `authenticate` — verifies the bearer JWT AND re-reads the user's CURRENT
//     status/role from the DB (a valid token proves identity, not access — §1.3).
//   • `requireRole` — coarse role-permission gate (domain-model §1.2 static map).
//   • Resource-scope helpers — reusable patterns for FUTURE transport endpoints
//     (student self, guardian→linked child w/ canTrack, driver→assigned trip,
//     admin). Sensitive existence is masked with 404, never 403 (§1.4).
// Staff passengers are never treated as students (ADR-022).
// ─────────────────────────────────────────────────────────────────────────────
import type { FastifyRequest } from "fastify";
import type { PrismaClient, UserRole } from "../../generated/prisma/client";
import { UserRole as Roles, UserStatus } from "../../generated/prisma/client";
import type { AuthenticatedUser } from "../common/auth-context";
import { AppError } from "../errors/app-error";
import { verifyAccessToken } from "./tokens";

const BEARER_RE = /^Bearer\s+(.+)$/i;

export async function authenticate(request: FastifyRequest): Promise<void> {
  const header = request.headers.authorization;
  const match = typeof header === "string" ? BEARER_RE.exec(header) : null;
  if (!match) throw AppError.unauthenticated("Missing bearer token.");
  const token = (match[1] as string).trim();
  if (!token) throw AppError.unauthenticated("Missing bearer token.");

  const { userId } = await verifyAccessToken(token); // throws 401 on invalid/expired

  // Re-check the CURRENT user state — do not trust token claims for status/role.
  const user = await request.server.prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, primaryRole: true, status: true },
  });
  if (!user) throw AppError.unauthenticated("Account no longer exists.");
  if (user.status !== UserStatus.ACTIVE) throw AppError.unauthenticated("Account is not active.");

  const authenticated: AuthenticatedUser = {
    id: user.id,
    email: user.email,
    primaryRole: user.primaryRole,
    status: user.status,
  };
  request.user = authenticated;
}

/** Compose AFTER `authenticate`: `preHandler: [authenticate, requireRole(Roles.ADMIN)]`. */
export function requireRole(...roles: UserRole[]) {
  const allowed = new Set(roles);
  return async function requireRoleHandler(request: FastifyRequest): Promise<void> {
    if (!request.user) throw AppError.unauthenticated();
    if (!allowed.has(request.user.primaryRole)) {
      throw AppError.forbidden("Your role is not permitted to perform this action.");
    }
  };
}

export interface CallerProfileIds {
  studentProfileId: string | null;
  guardianProfileId: string | null;
  driverProfileId: string | null;
  staffProfileId: string | null;
}

/** Resolve the caller's role-profile ids (all keyed by the UNIQUE userId). */
export async function resolveCallerProfileIds(
  prisma: PrismaClient,
  userId: string,
): Promise<CallerProfileIds> {
  const [student, guardian, driver, staff] = await Promise.all([
    prisma.studentProfile.findUnique({ where: { userId }, select: { id: true } }),
    prisma.guardianProfile.findUnique({ where: { userId }, select: { id: true } }),
    prisma.driverProfile.findUnique({ where: { userId }, select: { id: true } }),
    prisma.staffProfile.findUnique({ where: { userId }, select: { id: true } }),
  ]);
  return {
    studentProfileId: student?.id ?? null,
    guardianProfileId: guardian?.id ?? null,
    driverProfileId: driver?.id ?? null,
    staffProfileId: staff?.id ?? null,
  };
}

/**
 * STUDENT → own profile only. PARENT → a StudentGuardian link with canTrack=true.
 * ADMIN → any. DRIVER/STAFF → no student access by default. Used to gate future
 * student-scoped endpoints; returns false rather than throwing so callers decide.
 */
export async function canAccessStudent(
  prisma: PrismaClient,
  user: AuthenticatedUser,
  studentId: string,
): Promise<boolean> {
  if (user.primaryRole === Roles.ADMIN) return true;
  const ids = await resolveCallerProfileIds(prisma, user.id);
  if (user.primaryRole === Roles.STUDENT) return ids.studentProfileId === studentId;
  if (user.primaryRole === Roles.PARENT) {
    if (!ids.guardianProfileId) return false;
    const link = await prisma.studentGuardian.findFirst({
      where: { studentId, guardianId: ids.guardianProfileId, canTrack: true },
      select: { id: true },
    });
    return link !== null;
  }
  return false;
}

/** DRIVER → only a Trip whose driverId matches their DriverProfile. ADMIN → any. */
export async function canAccessTripAsDriver(
  prisma: PrismaClient,
  user: AuthenticatedUser,
  tripId: string,
): Promise<boolean> {
  if (user.primaryRole === Roles.ADMIN) return true;
  if (user.primaryRole !== Roles.DRIVER) return false;
  const ids = await resolveCallerProfileIds(prisma, user.id);
  if (!ids.driverProfileId) return false;
  const trip = await prisma.trip.findUnique({ where: { id: tripId }, select: { driverId: true } });
  return trip !== null && trip.driverId === ids.driverProfileId;
}

/**
 * Guard form of `canAccessStudent`: 404 (not 403) when access is denied, so the
 * existence of another family's student is never disclosed (§1.4 / ADR-008).
 */
export async function assertCanAccessStudent(
  prisma: PrismaClient,
  user: AuthenticatedUser,
  studentId: string,
): Promise<void> {
  if (!(await canAccessStudent(prisma, user, studentId))) {
    throw AppError.notFound("Resource not found.");
  }
}
