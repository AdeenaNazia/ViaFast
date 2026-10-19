// ─────────────────────────────────────────────────────────────────────────────
// Refresh-token persistence (Phase 4, Section 4). Only the SHA-256 HASH of each
// opaque token is ever stored. `familyId` groups a rotating chain so a replayed
// (already-rotated) token can revoke the whole family. Every mutating helper uses
// `updateMany` with a `revokedAt: null` guard so consumption is ATOMIC — two
// concurrent presentations of the same token cannot both succeed.
// Helpers accept a `Prisma.TransactionClient` so they run identically inside or
// outside an explicit transaction (a full PrismaClient is structurally assignable).
// ─────────────────────────────────────────────────────────────────────────────
import type { Prisma, RefreshToken, TokenRevokeReason } from "../../../generated/prisma/client";

export interface NewRefreshToken {
  userId: string;
  familyId: string;
  tokenHash: string;
  parentTokenId?: string | null;
  expiresAt: Date;
}

export async function createRefreshToken(
  db: Prisma.TransactionClient,
  input: NewRefreshToken,
): Promise<RefreshToken> {
  return db.refreshToken.create({
    data: {
      userId: input.userId,
      familyId: input.familyId,
      tokenHash: input.tokenHash,
      parentTokenId: input.parentTokenId ?? null,
      expiresAt: input.expiresAt,
    },
  });
}

export async function findRefreshTokenByHash(
  db: Prisma.TransactionClient,
  tokenHash: string,
): Promise<RefreshToken | null> {
  return db.refreshToken.findUnique({ where: { tokenHash } });
}

/**
 * Atomically revoke a single token IFF it is still active. Returns true only for
 * the caller that actually performed the revocation — the basis of rotation and
 * reuse detection (a false result means someone else consumed it first).
 */
export async function revokeTokenIfActive(
  db: Prisma.TransactionClient,
  tokenId: string,
  reason: TokenRevokeReason,
): Promise<boolean> {
  const result = await db.refreshToken.updateMany({
    where: { id: tokenId, revokedAt: null },
    data: { revokedAt: new Date(), revokeReason: reason },
  });
  return result.count === 1;
}

/** Revoke every still-active token in a family (reuse detection / forced logout). */
export async function revokeTokenFamily(
  db: Prisma.TransactionClient,
  familyId: string,
  reason: TokenRevokeReason,
): Promise<number> {
  const result = await db.refreshToken.updateMany({
    where: { familyId, revokedAt: null },
    data: { revokedAt: new Date(), revokeReason: reason },
  });
  return result.count;
}

/** Account-level revocation: revoke all of a user's active tokens (global logout). */
export async function revokeAllUserTokens(
  db: Prisma.TransactionClient,
  userId: string,
  reason: TokenRevokeReason,
): Promise<number> {
  const result = await db.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date(), revokeReason: reason },
  });
  return result.count;
}
