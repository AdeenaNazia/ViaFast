// ─────────────────────────────────────────────────────────────────────────────
// Password hashing — Argon2id (Phase 4, Sections 5 & 6).
// Only PHC-format `$argon2id$...` hashes are ever persisted; plaintext is never
// stored or logged. Verification failures return false and never throw, so the
// login path cannot distinguish "bad password" from "malformed/legacy hash".
// ─────────────────────────────────────────────────────────────────────────────
import { hash, verify } from "@node-rs/argon2";

// @node-rs/argon2 declares `Algorithm` as an ambient `const enum`, which cannot be
// referenced by name under `isolatedModules`. Argon2id === 2 (see its index.d.ts).
const ARGON2ID = 2;

// OWASP-recommended Argon2id parameters (m=19 MiB, t=2, p=1). Deliberately modest
// so dev/CI stay responsive; a production deployment can raise these via config.
const ARGON2_OPTIONS = {
  algorithm: ARGON2ID,
  memoryCost: 19456, // KiB
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
} as const;

/** Plaintext is capped well below this by request validation; the cap is a DoS guard. */
export const MAX_PASSWORD_LENGTH = 128;

export async function hashPassword(plaintext: string): Promise<string> {
  return hash(plaintext, ARGON2_OPTIONS);
}

export async function verifyPassword(storedHash: string, plaintext: string): Promise<boolean> {
  if (!storedHash) return false;
  try {
    // Parameters are read from the PHC string, so options need not be repeated.
    return await verify(storedHash, plaintext);
  } catch {
    return false;
  }
}
