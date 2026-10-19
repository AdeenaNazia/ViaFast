// ─────────────────────────────────────────────────────────────────────────────
// Users read-model (Phase 4, Section 7). Builds the SAFE principal/profile summary
// returned by `POST /auth/login` and `GET /me`. Selects only identity fields —
// never passwordHash, never refresh-token rows, never transport/business context
// (activeAssignment / currentTripId / linkedStudents are deferred with the
// transport endpoints per Section 13). displayName/avatarUrl come from whichever
// role profile is linked to the user.
// ─────────────────────────────────────────────────────────────────────────────
import type {
  DriverStatus,
  EnrollmentStatus,
  PrismaClient,
  UserRole,
  UserStatus,
} from "../../../generated/prisma/client";

export type RoleProfileSummary =
  | {
      kind: "student";
      id: string;
      studentNumber: string;
      fullName: string;
      enrollmentStatus: EnrollmentStatus;
    }
  | { kind: "guardian"; id: string; fullName: string }
  | {
      kind: "driver";
      id: string;
      fullName: string;
      employmentStatus: DriverStatus;
    }
  | { kind: "staff"; id: string; staffNumber: string; fullName: string; department: string };

export interface UserPrincipal {
  id: string;
  email: string;
  phoneE164: string | null;
  primaryRole: UserRole;
  status: UserStatus;
  displayName: string | null;
  avatarUrl: string | null;
  roleProfile: RoleProfileSummary | null;
}

/** The compact `user` object shared by the login response and `/me`. */
export interface PublicUser {
  id: string;
  email: string;
  primaryRole: UserRole;
  displayName: string | null;
  avatarUrl: string | null;
}

export function toPublicUser(principal: UserPrincipal): PublicUser {
  return {
    id: principal.id,
    email: principal.email,
    primaryRole: principal.primaryRole,
    displayName: principal.displayName,
    avatarUrl: principal.avatarUrl,
  };
}

/**
 * Load a user's identity + linked role-profile summary. Returns null when the user
 * does not exist. Issues exactly one query; profiles are optional 1:1 relations.
 */
export async function loadUserPrincipal(
  prisma: PrismaClient,
  userId: string,
): Promise<UserPrincipal | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      phoneE164: true,
      primaryRole: true,
      status: true,
      studentProfile: {
        select: { id: true, studentNumber: true, fullName: true, avatarUrl: true, enrollmentStatus: true },
      },
      guardianProfile: { select: { id: true, fullName: true } },
      driverProfile: {
        select: { id: true, fullName: true, avatarUrl: true, employmentStatus: true },
      },
      staffProfile: { select: { id: true, staffNumber: true, fullName: true, department: true } },
    },
  });
  if (!user) return null;

  let displayName: string | null = null;
  let avatarUrl: string | null = null;
  let roleProfile: RoleProfileSummary | null = null;

  if (user.studentProfile) {
    displayName = user.studentProfile.fullName;
    avatarUrl = user.studentProfile.avatarUrl;
    roleProfile = {
      kind: "student",
      id: user.studentProfile.id,
      studentNumber: user.studentProfile.studentNumber,
      fullName: user.studentProfile.fullName,
      enrollmentStatus: user.studentProfile.enrollmentStatus,
    };
  } else if (user.guardianProfile) {
    displayName = user.guardianProfile.fullName;
    roleProfile = { kind: "guardian", id: user.guardianProfile.id, fullName: user.guardianProfile.fullName };
  } else if (user.driverProfile) {
    displayName = user.driverProfile.fullName;
    avatarUrl = user.driverProfile.avatarUrl;
    roleProfile = {
      kind: "driver",
      id: user.driverProfile.id,
      fullName: user.driverProfile.fullName,
      employmentStatus: user.driverProfile.employmentStatus,
    };
  } else if (user.staffProfile) {
    displayName = user.staffProfile.fullName;
    roleProfile = {
      kind: "staff",
      id: user.staffProfile.id,
      staffNumber: user.staffProfile.staffNumber,
      fullName: user.staffProfile.fullName,
      department: user.staffProfile.department,
    };
  }

  return {
    id: user.id,
    email: user.email,
    phoneE164: user.phoneE164,
    primaryRole: user.primaryRole,
    status: user.status,
    displayName,
    avatarUrl,
    roleProfile,
  };
}
