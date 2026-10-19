// ─────────────────────────────────────────────────────────────────────────────
// Phase 4 authentication/authorization test suite (Section 11, all 14 scenarios).
// Runs entirely through `app.inject()` (no real sockets) against the isolated
// `viafast_test` database created by test/global-setup.ts. Fixtures are synthetic
// and namespaced by a per-run id; nothing here ever touches `viafast_dev`.
//
// Rate-limit isolation: @fastify/rate-limit keys on the request IP. Every
// functional request uses a UNIQUE source IP so counters never leak between tests;
// only scenario 12 deliberately reuses one IP to trip the limiter.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { SignJWT } from "jose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { UserRole, UserStatus } from "../generated/prisma/client";
import { buildApp } from "../src/app";
import { env } from "../src/config/env";
import { hashPassword } from "../src/security/password";
import { hashRefreshToken } from "../src/security/tokens";

const runId = randomUUID().slice(0, 8);
const emailOf = (name: string): string => `${name}-${runId}@viafast.test`;
const PASSWORD = "Str0ng-Passw0rd!";
const GENERIC = "Invalid credentials.";

let app: FastifyInstance;
let sharedHash: string;
let activeUserId: string;
let activeStudentProfileId: string;
let suspendedUserId: string;

let ipSeq = 0;
const uniqueIp = (): string => `10.0.0.${++ipSeq}`;

// Shared state across the rotation/reuse scenarios (tests run sequentially).
let firstRefreshToken: string;
let rotatedRefreshToken: string;

beforeAll(async () => {
  app = await buildApp({ logger: false });
  await app.ready();

  // Hash once and reuse — Argon2id is intentionally slow, so fixtures share a hash.
  sharedHash = await hashPassword(PASSWORD);

  const active = await app.prisma.user.create({
    data: {
      email: emailOf("active"),
      passwordHash: sharedHash,
      primaryRole: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
    },
    select: { id: true },
  });
  activeUserId = active.id;

  const profile = await app.prisma.studentProfile.create({
    data: {
      userId: active.id,
      studentNumber: `S-${runId}`,
      fullName: "Test Student",
      department: "Computer Science",
      semester: "Fall 2026",
    },
    select: { id: true },
  });
  activeStudentProfileId = profile.id;

  const suspended = await app.prisma.user.create({
    data: {
      email: emailOf("suspended"),
      passwordHash: sharedHash,
      primaryRole: UserRole.STUDENT,
      status: UserStatus.SUSPENDED,
    },
    select: { id: true },
  });
  suspendedUserId = suspended.id;
}, 120_000);

afterAll(async () => {
  try {
    // Best-effort cleanup of this run's fixtures (refresh tokens cascade on user).
    await app.prisma.studentProfile.deleteMany({ where: { id: activeStudentProfileId } });
    await app.prisma.user.deleteMany({ where: { id: { in: [activeUserId, suspendedUserId] } } });
  } finally {
    await app.close();
  }
}, 120_000);

describe("Phase 4 — authentication & authorization", () => {
  it("1. GET /health reports process liveness and database readiness", async () => {
    const res = await app.inject({ method: "GET", url: "/health", remoteAddress: uniqueIp() });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe("ok");
    expect(body.database).toBe("up");
    expect(res.headers["x-request-id"]).toBeTruthy();
    // Liveness must not expose infrastructure detail.
    expect(res.body).not.toContain("postgresql://");
    expect(res.body).not.toContain(env.accessTokenSecret);
  });

  it("2. login succeeds for an active user and returns a token pair", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      remoteAddress: uniqueIp(),
      payload: { identifier: emailOf("active"), password: PASSWORD },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.accessToken).toBeTypeOf("string");
    expect(body.refreshToken).toBeTypeOf("string");
    expect(body.expiresIn).toBe(env.accessTokenTtlSeconds);
    expect(body.user).toMatchObject({ id: activeUserId, email: emailOf("active"), primaryRole: "STUDENT" });
    // Never leak the hash or the plaintext password.
    expect(body.user).not.toHaveProperty("passwordHash");
    expect(res.body).not.toContain(PASSWORD);
    expect(res.body).not.toContain(sharedHash);
  });

  it("3. login rejects an invalid password with a generic 401", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      remoteAddress: uniqueIp(),
      payload: { identifier: emailOf("active"), password: "totally-wrong-password" },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toMatchObject({ code: "UNAUTHENTICATED", message: GENERIC });
  });

  it("4. login for a nonexistent account returns the SAME generic 401", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      remoteAddress: uniqueIp(),
      payload: { identifier: emailOf("ghost"), password: PASSWORD },
    });
    expect(res.statusCode).toBe(401);
    // Identical message to scenarios 3 & 5 => account existence is not disclosed.
    expect(res.json().error).toMatchObject({ code: "UNAUTHENTICATED", message: GENERIC });
  });

  it("5. login for a suspended (ineligible) account returns the SAME generic 401", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      remoteAddress: uniqueIp(),
      payload: { identifier: emailOf("suspended"), password: PASSWORD },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toMatchObject({ code: "UNAUTHENTICATED", message: GENERIC });
  });

  it("6. /me rejects missing and malformed bearer tokens", async () => {
    const missing = await app.inject({ method: "GET", url: "/api/v1/me", remoteAddress: uniqueIp() });
    expect(missing.statusCode).toBe(401);
    expect(missing.json().error.code).toBe("UNAUTHENTICATED");

    const malformed = await app.inject({
      method: "GET",
      url: "/api/v1/me",
      remoteAddress: uniqueIp(),
      headers: { authorization: "Bearer this.is.not.a.valid.jwt" },
    });
    expect(malformed.statusCode).toBe(401);
    expect(malformed.json().error.code).toBe("UNAUTHENTICATED");
  });

  it("7. /me returns the safe profile for a valid access token", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      remoteAddress: uniqueIp(),
      payload: { identifier: emailOf("active"), password: PASSWORD },
    });
    const { accessToken } = login.json();
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/me",
      remoteAddress: uniqueIp(),
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.user).toMatchObject({ id: activeUserId, primaryRole: "STUDENT", status: "ACTIVE" });
    expect(body.student).toMatchObject({ id: activeStudentProfileId, fullName: "Test Student" });
    // Sensitive fields must never appear.
    expect(res.body).not.toContain("passwordHash");
    expect(res.body).not.toContain("tokenHash");
    expect(res.body).not.toContain(PASSWORD);
  });

  it("8. /me rejects an expired access token", async () => {
    const now = Math.floor(Date.now() / 1000);
    const expired = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setSubject(activeUserId)
      .setIssuer(env.tokenIssuer)
      .setAudience(env.tokenAudience)
      .setIssuedAt(now - 7200)
      .setExpirationTime(now - 3600)
      .setJti(randomUUID())
      .sign(env.accessTokenSecretBytes);
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/me",
      remoteAddress: uniqueIp(),
      headers: { authorization: `Bearer ${expired}` },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe("UNAUTHENTICATED");
  });

  it("9. refresh rotates the token and persists only its hash", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      remoteAddress: uniqueIp(),
      payload: { identifier: emailOf("active"), password: PASSWORD },
    });
    firstRefreshToken = login.json().refreshToken as string;

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      remoteAddress: uniqueIp(),
      payload: { refreshToken: firstRefreshToken },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.refreshToken).toBeTypeOf("string");
    expect(body.refreshToken).not.toBe(firstRefreshToken);
    expect(body.user.id).toBe(activeUserId);
    rotatedRefreshToken = body.refreshToken as string;

    // The presented token is now revoked (ROTATED) and stored ONLY as a hash.
    const oldRow = await app.prisma.refreshToken.findUnique({
      where: { tokenHash: hashRefreshToken(firstRefreshToken) },
    });
    expect(oldRow).not.toBeNull();
    expect(oldRow?.revokedAt).not.toBeNull();
    expect(oldRow?.revokeReason).toBe("ROTATED");
    expect(oldRow?.tokenHash).toBe(hashRefreshToken(firstRefreshToken));
    expect(oldRow?.tokenHash).not.toBe(firstRefreshToken);
  });

  it("10. reusing a rotated refresh token revokes the whole family", async () => {
    // Replay the ORIGINAL (already-rotated) token => reuse detection.
    const replay = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      remoteAddress: uniqueIp(),
      payload: { refreshToken: firstRefreshToken },
    });
    expect(replay.statusCode).toBe(401);

    // The legitimate successor from scenario 9 must now be dead too (family revoked).
    const successor = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      remoteAddress: uniqueIp(),
      payload: { refreshToken: rotatedRefreshToken },
    });
    expect(successor.statusCode).toBe(401);

    const family = await app.prisma.refreshToken.findMany({
      where: { tokenHash: { in: [hashRefreshToken(firstRefreshToken), hashRefreshToken(rotatedRefreshToken)] } },
      select: { revokeReason: true },
    });
    expect(family.some((t) => t.revokeReason === "REUSE_DETECTED")).toBe(true);
  });

  it("11. logout revokes the refresh token (idempotently)", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      remoteAddress: uniqueIp(),
      payload: { identifier: emailOf("active"), password: PASSWORD },
    });
    const { accessToken, refreshToken } = login.json();

    const out = await app.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      remoteAddress: uniqueIp(),
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { refreshToken },
    });
    expect(out.statusCode).toBe(204);

    // The revoked refresh token can no longer be used.
    const after = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      remoteAddress: uniqueIp(),
      payload: { refreshToken },
    });
    expect(after.statusCode).toBe(401);

    // Logging out again with the same (already-revoked) token is still a safe 204.
    const again = await app.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      remoteAddress: uniqueIp(),
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { refreshToken },
    });
    expect(again.statusCode).toBe(204);
  });

  it("12. login is rate limited after too many attempts from one IP", async () => {
    const ip = uniqueIp();
    const max = env.authRateLimitMax; // 5 in the test environment
    let sawRateLimit = false;
    for (let attempt = 0; attempt <= max; attempt++) {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        remoteAddress: ip,
        payload: { identifier: emailOf("ratelimit"), password: "does-not-matter" },
      });
      if (res.statusCode === 429) {
        sawRateLimit = true;
        expect(res.json().error.code).toBe("RATE_LIMITED");
        expect(res.headers["retry-after"]).toBeTruthy();
        break;
      }
      expect(res.statusCode).toBe(401); // attempts before the limit are normal failures
    }
    expect(sawRateLimit).toBe(true);
  });

  it("13. protected endpoints reject unauthenticated callers", async () => {
    const me = await app.inject({ method: "GET", url: "/api/v1/me", remoteAddress: uniqueIp() });
    expect(me.statusCode).toBe(401);
    expect(me.json().error.code).toBe("UNAUTHENTICATED");

    const logout = await app.inject({ method: "POST", url: "/api/v1/auth/logout", remoteAddress: uniqueIp() });
    expect(logout.statusCode).toBe(401);
    expect(logout.json().error.code).toBe("UNAUTHENTICATED");
  });

  it("14. error responses use the stable envelope and leak no secrets", async () => {
    const notFound = await app.inject({ method: "GET", url: "/api/v1/does-not-exist", remoteAddress: uniqueIp() });
    expect(notFound.statusCode).toBe(404);
    expect(notFound.json().error.code).toBe("NOT_FOUND");
    expect(notFound.headers["x-request-id"]).toBeTruthy();

    const badBody = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      remoteAddress: uniqueIp(),
      headers: { "content-type": "application/json" },
      payload: { identifier: "" }, // missing password + empty identifier => validation failure
    });
    expect(badBody.statusCode).toBe(400);
    const envelope = badBody.json().error;
    expect(envelope.code).toBe("VALIDATION_FAILED");
    expect(Array.isArray(envelope.details)).toBe(true);

    for (const raw of [notFound.body, badBody.body]) {
      expect(raw).not.toContain("postgresql://");
      expect(raw).not.toContain(env.accessTokenSecret);
      expect(raw).not.toContain(PASSWORD);
      expect(raw.toLowerCase()).not.toContain("stack");
      expect(raw).not.toContain(" at Object.");
    }
  });
});
