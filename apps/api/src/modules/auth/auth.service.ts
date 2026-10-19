// ─────────────────────────────────────────────────────────────────────────────
// Authentication service (Phase 4, Sections 5, 6 & 7): login, refresh, logout.
//
// Token lifecycle:
//   login   → verify Argon2id hash, require an ACTIVE user, open a NEW token
//             family, persist the refresh-token HASH, return a fresh pair.
//   refresh → look up by hash; a REVOKED token is treated as replay and revokes
//             the whole family (REUSE_DETECTED); an EXPIRED token is rejected;
//             otherwise rotate ATOMICALLY (revoke-old-iff-active + mint successor
//             in one transaction) and re-check the user is still ACTIVE.
//   logout  → revoke the presented token's family, or (no token) every family the
//             caller owns. Always succeeds; safe when already revoked.
//
// Failure behavior is deliberately generic: login never discloses whether the
// account exists, has a password, or is inactive — it runs one Argon2 verify even
// for unknown accounts so timing does not leak presence (Section 5).
// ─────────────────────────────────────────────────────────────────────────────
import type { PrismaClient } from "../../../generated/prisma/client";
import { TokenRevokeReason, UserStatus } from "../../../generated/prisma/client";
import { AppError } from "../../errors/app-error";
import { hashPassword, verifyPassword } from "../../security/password";
import {
  generateRefreshToken,
  hashRefreshToken,
  newTokenFamilyId,
  refreshExpiryDate,
  signAccessToken,
} from "../../security/tokens";
import { loadUserPrincipal, toPublicUser, type PublicUser } from "../users/users.service";
import {
  createRefreshToken,
  findRefreshTokenByHash,
  revokeAllUserTokens,
  revokeTokenFamily,
  revokeTokenIfActive,
} from "./refresh-token.repository";

export interface AuthTokenResponse {
  accessToken: string;
  refreshToken: string;
  /** Access-token lifetime in seconds (matches the JWT `exp - iat`). */
  expiresIn: number;
  user: PublicUser;
}

// A single lazily-computed Argon2id hash, verified against when the account is
// unknown so that response timing does not reveal whether an account exists.
let dummyHashPromise: Promise<string> | null = null;
function dummyHash(): Promise<string> {
  if (dummyHashPromise === null) {
    dummyHashPromise = hashPassword("viafast-timing-equalization-placeholder");
  }
  return dummyHashPromise;
}

export async function login(
  prisma: PrismaClient,
  identifier: string,
  password: string,
): Promise<AuthTokenResponse> {
  const trimmed = identifier.trim();
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: { equals: trimmed, mode: "insensitive" } }, { phoneE164: trimmed }],
    },
    select: { id: true, status: true, passwordHash: true },
  });

  const storedHash = user?.passwordHash ?? null;
  // Always perform exactly one Argon2 verify (real or dummy) to equalize timing.
  const passwordMatches = await verifyPassword(storedHash ?? (await dummyHash()), password);

  // One generic failure for every rejection reason — never reveal which condition tripped.
  if (!user || storedHash === null || !passwordMatches || user.status !== UserStatus.ACTIVE) {
    throw AppError.unauthenticated("Invalid credentials.");
  }

  const principal = await loadUserPrincipal(prisma, user.id);
  if (!principal || principal.status !== UserStatus.ACTIVE) {
    throw AppError.unauthenticated("Invalid credentials.");
  }

  const familyId = newTokenFamilyId();
  const rawRefresh = generateRefreshToken();
  const expiresAt = refreshExpiryDate();

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await createRefreshToken(tx, {
      userId: user.id,
      familyId,
      tokenHash: hashRefreshToken(rawRefresh),
      expiresAt,
    });
  });

  const access = await signAccessToken(user.id);
  return {
    accessToken: access.token,
    refreshToken: rawRefresh,
    expiresIn: access.expiresInSeconds,
    user: toPublicUser(principal),
  };
}

export async function refresh(prisma: PrismaClient, rawToken: string): Promise<AuthTokenResponse> {
  const tokenHash = hashRefreshToken(rawToken);
  const record = await findRefreshTokenByHash(prisma, tokenHash);
  if (!record) throw AppError.unauthenticated("Invalid refresh token.");

  // Replaying a consumed/revoked token signals a stolen token: revoke the family.
  if (record.revokedAt !== null) {
    await revokeTokenFamily(prisma, record.familyId, TokenRevokeReason.REUSE_DETECTED);
    throw AppError.unauthenticated("Refresh token is no longer valid.");
  }
  if (record.expiresAt.getTime() <= Date.now()) {
    throw AppError.unauthenticated("Refresh token expired.");
  }

  // Re-check current eligibility server-side; a valid token proves identity only.
  const user = await prisma.user.findUnique({
    where: { id: record.userId },
    select: { id: true, status: true },
  });
  if (!user || user.status !== UserStatus.ACTIVE) {
    await revokeTokenFamily(prisma, record.familyId, TokenRevokeReason.ADMIN);
    throw AppError.unauthenticated("Account is not active.");
  }

  const principal = await loadUserPrincipal(prisma, user.id);
  if (!principal) throw AppError.unauthenticated("Account no longer exists.");

  const rawRefresh = generateRefreshToken();
  const newHash = hashRefreshToken(rawRefresh);
  const expiresAt = refreshExpiryDate();

  // Atomic rotation. If the presented token was already consumed by a concurrent
  // request, `revokeTokenIfActive` returns false and we treat it as reuse.
  const rotated = await prisma.$transaction(async (tx) => {
    const didRevoke = await revokeTokenIfActive(tx, record.id, TokenRevokeReason.ROTATED);
    if (!didRevoke) return false;
    await createRefreshToken(tx, {
      userId: record.userId,
      familyId: record.familyId,
      tokenHash: newHash,
      parentTokenId: record.id,
      expiresAt,
    });
    return true;
  });

  if (!rotated) {
    await revokeTokenFamily(prisma, record.familyId, TokenRevokeReason.REUSE_DETECTED);
    throw AppError.unauthenticated("Refresh token is no longer valid.");
  }

  const access = await signAccessToken(user.id);
  return {
    accessToken: access.token,
    refreshToken: rawRefresh,
    expiresIn: access.expiresInSeconds,
    user: toPublicUser(principal),
  };
}

/**
 * Revoke the presented token's family, or — when no token is supplied — every
 * family the caller owns. Idempotent and safe if the token is already revoked.
 * A token that does not belong to the caller is ignored (never mutate another
 * user's session, and never disclose that the token exists).
 */
export async function logout(prisma: PrismaClient, userId: string, rawToken?: string): Promise<void> {
  if (rawToken) {
    const record = await findRefreshTokenByHash(prisma, hashRefreshToken(rawToken));
    if (record && record.userId === userId) {
      await revokeTokenFamily(prisma, record.familyId, TokenRevokeReason.LOGOUT);
    }
    return;
  }
  await revokeAllUserTokens(prisma, userId, TokenRevokeReason.LOGOUT);
}
