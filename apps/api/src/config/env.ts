// ─────────────────────────────────────────────────────────────────────────────
// Typed environment configuration + startup validation (Phase 4, Section 3).
//
// Guarantees:
//   • Every required variable is present and well-formed BEFORE the app starts.
//   • Production refuses to boot on missing/weak secrets or wildcard CORS.
//   • No secret is ever derived from a hard-coded production value; in dev/test a
//     missing ACCESS_TOKEN_SECRET yields an EPHEMERAL random secret (warned), so
//     tokens simply do not survive a restart rather than using a known constant.
//   • NODE_ENV=test HARD-REQUIRES a database whose name contains "test", so the
//     suite can never run against viafast_dev (Section 11).
//   • Nothing here is exposed through API responses or logs (Section 3/9).
// ─────────────────────────────────────────────────────────────────────────────
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { z } from "zod";

const DURATION_RE = /^(\d+)([smhd])$/;
const UNIT_SECONDS = { s: 1, m: 60, h: 3600, d: 86400 } as const;
const KNOWN_WEAK_SECRETS = new Set([
  "changeme",
  "change_me",
  "secret",
  "dev",
  "development",
  "password",
  "viafast",
  "viafast_dev_only",
  "access_token_secret",
]);

export function parseDurationSeconds(value: string, field: string): number {
  const match = DURATION_RE.exec(value.trim());
  if (!match) {
    throw new Error(`${field} must be a duration like "900s", "15m", "12h" or "30d" (received "${value}")`);
  }
  const amount = Number.parseInt(match[1] as string, 10);
  const unit = match[2] as keyof typeof UNIT_SECONDS;
  const seconds = amount * UNIT_SECONDS[unit];
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error(`${field} must be a positive, non-zero duration`);
  }
  return seconds;
}

function databaseNameOf(url: string): string {
  try {
    return new URL(url).pathname.replace(/^\//, "");
  } catch {
    return "";
  }
}

const Duration = z
  .string()
  .refine((v) => DURATION_RE.test(v.trim()), {
    message: 'must be a duration <number><unit> where unit is one of s|m|h|d (e.g. "15m")',
  });

const RawEnv = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().min(1).default("127.0.0.1"),
  PORT: z.coerce.number().int().min(0).max(65535).default(8080),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  DATABASE_URL: z
    .string()
    .refine((v) => v.startsWith("postgresql://") || v.startsWith("postgres://"), {
      message: "must be a postgresql:// connection string",
    }),
  ACCESS_TOKEN_SECRET: z.string().optional(),
  ACCESS_TOKEN_TTL: Duration.default("15m"),
  REFRESH_TOKEN_TTL: Duration.default("30d"),
  TOKEN_ISSUER: z.string().min(1).default("viafast-api"),
  TOKEN_AUDIENCE: z.string().min(1).default("viafast-clients"),
  CORS_ALLOWED_ORIGINS: z.string().default(""),
  TRUST_PROXY: z.enum(["true", "false"]).default("false"),
  // Stricter limiter for the credential-handling routes (login/refresh). Lower it
  // in tests to exercise 429 deterministically.
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(100000).default(10),
  AUTH_RATE_LIMIT_WINDOW: Duration.default("5m"),
});

export interface Env {
  readonly nodeEnv: "development" | "test" | "production";
  readonly isProduction: boolean;
  readonly isTest: boolean;
  readonly isDevelopment: boolean;
  readonly host: string;
  readonly port: number;
  readonly logLevel: string;
  readonly databaseUrl: string;
  readonly databaseName: string;
  /** HS256 signing key material. Never log or return this. */
  readonly accessTokenSecret: string;
  readonly accessTokenSecretBytes: Uint8Array;
  readonly accessTokenTtlSeconds: number;
  readonly refreshTokenTtlSeconds: number;
  readonly tokenIssuer: string;
  readonly tokenAudience: string;
  readonly corsOrigins: readonly string[];
  readonly trustProxy: boolean;
  readonly authRateLimitMax: number;
  readonly authRateLimitWindowMs: number;
  /** True when a random dev/test secret was generated because none was configured. */
  readonly ephemeralAccessTokenSecret: boolean;
}

function describeIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
}

export function loadEnv(raw: NodeJS.ProcessEnv = process.env): Env {
  const parsed = RawEnv.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration:\n${describeIssues(parsed.error)}`);
  }
  const v = parsed.data;
  const isProduction = v.NODE_ENV === "production";
  const isTest = v.NODE_ENV === "test";

  const databaseName = databaseNameOf(v.DATABASE_URL);

  // Section 11 safety net: the test suite must never touch a non-test database.
  if (isTest && !/test/i.test(databaseName)) {
    throw new Error(
      `NODE_ENV=test requires a dedicated test database whose name contains "test" ` +
        `(got "${databaseName || "<unknown>"}"). Refusing to start.`,
    );
  }

  const origins = v.CORS_ALLOWED_ORIGINS.split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  if (isProduction) {
    if (origins.length === 0) {
      throw new Error(
        "CORS_ALLOWED_ORIGINS must list at least one explicit origin in production.",
      );
    }
    if (origins.includes("*")) {
      throw new Error(
        "CORS_ALLOWED_ORIGINS must not contain '*' in production (credentialed wildcard is forbidden).",
      );
    }
  }

  const accessTokenTtlSeconds = parseDurationSeconds(v.ACCESS_TOKEN_TTL, "ACCESS_TOKEN_TTL");
  const refreshTokenTtlSeconds = parseDurationSeconds(v.REFRESH_TOKEN_TTL, "REFRESH_TOKEN_TTL");
  if (accessTokenTtlSeconds < 60 || accessTokenTtlSeconds > 3600) {
    throw new Error("ACCESS_TOKEN_TTL must be between 60s and 1h (3600s).");
  }
  if (refreshTokenTtlSeconds <= accessTokenTtlSeconds) {
    throw new Error("REFRESH_TOKEN_TTL must be strictly greater than ACCESS_TOKEN_TTL.");
  }
  if (refreshTokenTtlSeconds > 90 * 86400) {
    throw new Error("REFRESH_TOKEN_TTL must be at most 90d.");
  }

  let accessTokenSecret = v.ACCESS_TOKEN_SECRET ?? "";
  let ephemeralAccessTokenSecret = false;
  if (!accessTokenSecret) {
    if (isProduction) {
      throw new Error(
        "ACCESS_TOKEN_SECRET is required in production and must be a cryptographically " +
          "random string of at least 32 characters. Refusing to start.",
      );
    }
    accessTokenSecret = randomBytes(32).toString("base64url");
    ephemeralAccessTokenSecret = true;
    // Deliberately does NOT print the secret value.
    console.warn(
      "[env] ACCESS_TOKEN_SECRET not set — generated an EPHEMERAL random secret for " +
        `${v.NODE_ENV}. Issued tokens will NOT survive a restart. Set a stable secret in .env.`,
    );
  } else if (isProduction && (accessTokenSecret.length < 32 || KNOWN_WEAK_SECRETS.has(accessTokenSecret.toLowerCase()))) {
    throw new Error(
      "ACCESS_TOKEN_SECRET is too weak for production: require >= 32 characters and not a known placeholder.",
    );
  }

  const authRateLimitWindowSeconds = parseDurationSeconds(
    v.AUTH_RATE_LIMIT_WINDOW,
    "AUTH_RATE_LIMIT_WINDOW",
  );

  return Object.freeze({
    nodeEnv: v.NODE_ENV,
    isProduction,
    isTest,
    isDevelopment: v.NODE_ENV === "development",
    host: v.HOST,
    port: v.PORT,
    logLevel: v.LOG_LEVEL,
    databaseUrl: v.DATABASE_URL,
    databaseName,
    accessTokenSecret,
    accessTokenSecretBytes: new TextEncoder().encode(accessTokenSecret),
    accessTokenTtlSeconds,
    refreshTokenTtlSeconds,
    tokenIssuer: v.TOKEN_ISSUER,
    tokenAudience: v.TOKEN_AUDIENCE,
    corsOrigins: Object.freeze(origins),
    trustProxy: v.TRUST_PROXY === "true",
    authRateLimitMax: v.AUTH_RATE_LIMIT_MAX,
    authRateLimitWindowMs: authRateLimitWindowSeconds * 1000,
    ephemeralAccessTokenSecret,
  });
}

/** Process-wide validated configuration. Loading this module validates eagerly. */
export const env: Env = loadEnv();
