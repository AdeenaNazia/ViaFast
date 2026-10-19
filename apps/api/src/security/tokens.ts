// ─────────────────────────────────────────────────────────────────────────────
// Token primitives (Phase 4, Section 6).
//   • Access token = short-lived HS256 JWT with ONLY the necessary claims
//     (sub, iss, aud, iat, exp, jti). No role claim: authorization always re-reads
//     the user's current status/role from the database (Sections 6 & 8).
//   • Refresh token = high-entropy OPAQUE random string. Only its SHA-256 hash is
//     persisted; the raw value is returned to the client once and never stored.
// Times are passed to jose as absolute epoch seconds to avoid span-string ambiguity.
// ─────────────────────────────────────────────────────────────────────────────
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { SignJWT, errors as joseErrors, jwtVerify } from "jose";
import { env } from "../config/env";
import { AppError } from "../errors/app-error";

export interface SignedAccessToken {
  token: string;
  jti: string;
  expiresInSeconds: number;
}

export async function signAccessToken(userId: string): Promise<SignedAccessToken> {
  const jti = randomUUID();
  const issuedAt = Math.floor(Date.now() / 1000);
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setIssuer(env.tokenIssuer)
    .setAudience(env.tokenAudience)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + env.accessTokenTtlSeconds)
    .setJti(jti)
    .sign(env.accessTokenSecretBytes);
  return { token, jti, expiresInSeconds: env.accessTokenTtlSeconds };
}

export interface VerifiedAccessToken {
  userId: string;
  jti: string;
}

export async function verifyAccessToken(token: string): Promise<VerifiedAccessToken> {
  try {
    const { payload } = await jwtVerify(token, env.accessTokenSecretBytes, {
      issuer: env.tokenIssuer,
      audience: env.tokenAudience,
      algorithms: ["HS256"],
      clockTolerance: 5,
    });
    if (typeof payload.sub !== "string" || payload.sub.length === 0) {
      throw AppError.unauthenticated("Invalid access token.");
    }
    return { userId: payload.sub, jti: typeof payload.jti === "string" ? payload.jti : "" };
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error instanceof joseErrors.JWTExpired) {
      throw AppError.unauthenticated("Access token expired.");
    }
    // Signature failure, bad iss/aud, malformed token — all generic 401.
    throw AppError.unauthenticated("Invalid access token.");
  }
}

/** 384-bit opaque refresh token (base64url). Returned to the client exactly once. */
export function generateRefreshToken(): string {
  return randomBytes(48).toString("base64url");
}

/** SHA-256 hex digest of a refresh token — the ONLY form persisted (Section 4). */
export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Identifier grouping a rotating chain of refresh tokens for reuse detection. */
export function newTokenFamilyId(): string {
  return randomBytes(16).toString("base64url");
}

export function refreshExpiryDate(fromMs = Date.now()): Date {
  return new Date(fromMs + env.refreshTokenTtlSeconds * 1000);
}
