// ─────────────────────────────────────────────────────────────────────────────
// Request validation schemas for the auth endpoints (Phase 4, Sections 7 & 9).
// Parsed with `parseWith` BEFORE any business logic, so malformed input becomes a
// 400 VALIDATION_FAILED envelope rather than reaching the database. Passwords are
// length-capped to bound Argon2 work (a DoS guard); the plaintext is never logged.
// ─────────────────────────────────────────────────────────────────────────────
import { z } from "zod";
import { MAX_PASSWORD_LENGTH } from "../../security/password";

/** `identifier` is an email OR an E.164 phone (api-contract §3). 320 = RFC email max. */
export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "identifier is required").max(320, "identifier is too long"),
  password: z.string().min(1, "password is required").max(MAX_PASSWORD_LENGTH, "password is too long"),
});

export const refreshSchema = z.object({
  // Opaque base64url token; generous cap covers 384-bit values with headroom.
  refreshToken: z.string().trim().min(1, "refreshToken is required").max(512, "refreshToken is too long"),
});

/** Logout accepts an optional refresh token; absent => revoke all of the caller's tokens. */
export const logoutSchema = z.object({
  refreshToken: z.string().trim().min(1).max(512).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
