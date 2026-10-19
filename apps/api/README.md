# @viafast/api — Backend Foundation & Authentication (Phases 3–4)

Node.js + TypeScript + **Fastify** backend for the ViaFast campus-transport platform,
built on the **Prisma 7** / PostgreSQL foundation from Phase 3. Phase 4 adds a
runnable, tested HTTP server with **secure authentication and an authorization
foundation**.

> **Scope of this phase — backend foundation + auth ONLY.**
> Implemented: `GET /health`, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`,
> `POST /api/v1/auth/logout`, `GET /api/v1/me`, plus reusable auth/authz helpers.
> Intentionally **NOT** here yet: transport business endpoints (student/parent/driver/
> route/vehicle/trip/boarding/fee/incident), WebSockets, GPS-provider integration,
> push notifications, and any Flutter/React client wiring. The React admin (`/src`)
> and the Flutter app (`/apps/mobile`) are **untouched**.

Contracts: [`docs/architecture/api-contract.md`](../../docs/architecture/api-contract.md),
[`domain-model.md`](../../docs/architecture/domain-model.md),
[`architecture-decisions.md`](../../docs/architecture/architecture-decisions.md).

---

## Stack & versions (pinned, mutually compatible)

| Tool | Version | Note |
|---|---|---|
| Node.js | `>=20.19` (developed on v25.x) | Prisma 7 engine requirement. |
| `fastify` | **^5.12.7** | HTTP framework. |
| `@fastify/cors` · `@fastify/helmet` · `@fastify/rate-limit` | ^11.3.1 · ^13.1.2 · ^11.2.1 | All target Fastify 5. |
| `fastify-plugin` | ^5.1.0 | Root-instance decorations (`app.prisma`). |
| `jose` | ^6.2.12 | HS256 JWT sign/verify (no native deps). |
| `@node-rs/argon2` | ^2.2.2 | Argon2id; N-API prebuilt binary (no node-gyp). |
| `zod` | ^3.25.76 | Env + request validation. |
| `prisma` / `@prisma/client` / `@prisma/adapter-pg` | **7.10.0** | Pinned. `latest` points at an 8.0 RC — do **not** float. |
| `vitest` | ^4.1.11 | Tests via `app.inject()` (no real sockets). |
| TypeScript | ~5.8 | ESM (`"type": "module"`), `strict`. |

Prisma 7 notes (unchanged from Phase 3): config lives in **`prisma7.config.ts`**; the
generator is **`prisma-client`** emitting to **`generated/prisma/`** (git-ignored);
`.env` is loaded via `import "dotenv/config"`; the client needs the **`PrismaPg`** adapter.

---

## Quick start

```bash
cd apps/api
npm install                     # pinned toolchain
cp .env.example .env            # edit with YOUR local dev DB + a secret (never committed)
npm run prisma:generate         # generate generated/prisma (ESM client)
npm run prisma:migrate:deploy   # apply committed migrations to viafast_dev (non-destructive)

npm run provision:dev-user      # create the first login account (interactive, dev-only)
npm run dev                     # start with reload  → http://127.0.0.1:8080
# or:  npm start                # start once
```

Smoke check:

```bash
curl -s http://127.0.0.1:8080/health
# {"status":"ok","database":"up","uptimeSeconds":N}

curl -s -X POST http://127.0.0.1:8080/api/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"identifier":"you@campus.edu","password":"<your-password>"}'
```

---

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | `tsx watch src/server.ts` — dev server with reload. |
| `npm start` | `tsx src/server.ts` — run once. |
| `npm test` | `vitest run` — the 14-scenario suite against an isolated **`viafast_test`** DB. |
| `npm run test:watch` | `vitest` in watch mode. |
| `npm run provision:dev-user` | Interactive, **development-only** user provisioning CLI. |
| `npm run typecheck` | `tsc --noEmit` over `src`, `scripts`, `test`, `prisma`. |
| `npm run prisma:validate` / `:generate` | Validate schema / regenerate client. |
| `npm run prisma:migrate:dev` / `:deploy` | Create+apply / apply committed migrations. |
| `npm run db:seed` | Idempotent synthetic dev seed (Phase 3). |

No linter is configured for this package, so `typecheck` + `test` are the gates.

---

## Configuration

All settings are read from the environment, validated **at startup** by
[`src/config/env.ts`](./src/config/env.ts) with Zod, and documented in
[`.env.example`](./.env.example). The process refuses to boot on invalid config.

| Variable | Required | Default | Notes |
|---|---|---|---|
| `NODE_ENV` | – | `development` | `test` **requires** a DB name containing `test`. |
| `HOST` / `PORT` | – | `127.0.0.1` / `8080` | Bind least-privilege by default. |
| `LOG_LEVEL` | – | `info` | pino level. |
| `DATABASE_URL` | **yes** | – | `postgresql://…`. Never exposed via API/logs. |
| `ACCESS_TOKEN_SECRET` | **prod** | *(ephemeral in dev/test)* | HS256 key, ≥32 chars, not a known placeholder. |
| `ACCESS_TOKEN_TTL` | – | `15m` | Must be 60s–1h. |
| `REFRESH_TOKEN_TTL` | – | `30d` | Must exceed access TTL; ≤90d. |
| `TOKEN_ISSUER` / `TOKEN_AUDIENCE` | – | `viafast-api` / `viafast-clients` | Validated on every request. |
| `CORS_ALLOWED_ORIGINS` | **prod** | *(empty → CORS off)* | Explicit allowlist; `*` forbidden. |
| `TRUST_PROXY` | – | `false` | Enable only behind a known reverse proxy. |
| `AUTH_RATE_LIMIT_MAX` / `_WINDOW` | – | `10` / `5m` | Strict limiter for login/refresh. |

**Secrets.** In production a missing/weak `ACCESS_TOKEN_SECRET` or an empty/wildcard
CORS list aborts startup. In dev/test, a missing secret generates an **ephemeral random**
key (warned, never printed) so tokens simply don't survive a restart — there is **no**
hard-coded fallback secret. Generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

---

## Architecture / layout

```
apps/api/
├─ src/
│  ├─ app.ts                 # buildApp() factory — plugins + routes (no listen)
│  ├─ server.ts              # process entry — validates env, binds port, graceful shutdown
│  ├─ config/env.ts          # typed env + startup validation (prod/test guards)
│  ├─ plugins/               # prisma, request-id, security (helmet/cors/rate-limit), error-handler
│  ├─ common/auth-context.ts # AuthenticatedUser + Fastify request.user typing
│  ├─ errors/app-error.ts    # ErrorCode ↔ HTTP envelope (§1.4)
│  ├─ security/              # password (argon2id), tokens (jose JWT + opaque refresh), guards
│  ├─ validation/validate.ts # Zod → VALIDATION_FAILED envelope
│  └─ modules/
│     ├─ auth/               # schemas, refresh-token repository, service, routes
│     ├─ users/              # users.service (safe principal), me.routes
│     └─ health/             # health.routes
├─ scripts/provision-dev-user.ts
├─ test/                     # global-setup.ts (creates+migrates viafast_test), auth.test.ts
├─ vitest.config.ts
├─ prisma/                   # schema.prisma, seed.ts, migrations/
└─ generated/prisma/         # generated client (git-ignored)
```

`buildApp()` returns a configured instance **without listening**, so tests drive it with
`app.inject()` and `server.ts` binds it to a port. Cross-cutting order: prisma →
request-id → security → error handling → routes.

---

## Endpoints (this phase)

| Method & path | Auth | Behavior |
|---|---|---|
| `GET /health` | public | Liveness (`status:"ok"`) + DB readiness (`database:"up"\|"down"`). Rate-limit exempt. No internals. |
| `POST /api/v1/auth/login` | public | `{identifier,password}` → 200 token pair, or **generic** 401. Strictly rate-limited. |
| `POST /api/v1/auth/refresh` | public | `{refreshToken}` → 200 rotated pair; 401 on expired/revoked/reused. Strictly rate-limited. |
| `POST /api/v1/auth/logout` | bearer | Optional `{refreshToken}` → revoke that family; absent → revoke all of the caller's. Always 204, idempotent. |
| `GET /api/v1/me` | bearer | Safe principal + role-profile summary. Re-checks current status. |

Paths follow `api-contract.md` (base `/api/v1`); `/health` is an unversioned infra probe.
All non-2xx use the contract envelope `{error:{code,message,requestId,details?}}` and every
response carries `X-Request-Id`.

> **Deliberate narrowing of `GET /me`.** The contract's `/me` example also shows
> `activeAssignment`, `currentTripId`, and `linkedStudents`. Those require route/trip/
> assignment queries that this phase's scope forbids, so they are **omitted** and deferred
> to the transport phase. `/me` here answers *"who am I"* (principal + role identity), not
> *"what is my ride"*.

---

## Authentication & token lifecycle

**Access token** — short-lived **HS256 JWT** signed with `jose`. Claims are minimal:
`sub` (user id), `iss`, `aud`, `iat`, `exp`, `jti`. **No role/status claim** — every
authenticated request re-reads the user's current `status`/`primaryRole` from the DB, so a
token for a since-suspended or deleted account stops working immediately. Verification
checks signature, issuer, audience, algorithm, and expiry (5s clock tolerance).

**Refresh token** — a 384-bit **opaque** random string (`base64url`). Only its **SHA-256
hash** is stored (`RefreshToken.tokenHash`); the raw value is returned to the client once
and never persisted. Each login opens a new **family** (`familyId`); rotation links
`parentTokenId`.

**Rotation & reuse detection.** `refresh` revokes the presented token and mints its
successor **in one transaction**, using an atomic `updateMany … WHERE revokedAt IS NULL`
guard. Presenting an already-revoked token (replay), or losing the atomic race, is treated
as compromise: the **entire family is revoked** (`REUSE_DETECTED`) and the request gets 401.

**Failure behavior (all generic 401):** unknown account, wrong password, account without a
password, inactive/suspended account, unknown refresh token, expired refresh token, reused
refresh token. Login runs **one Argon2 verify even for unknown accounts** (against a dummy
hash) so timing does not disclose whether an account exists.

**Revocation.** Logout revokes a single family (token supplied) or all of a user's families
(token omitted) — `TokenRevokeReason` records `ROTATED` / `REUSE_DETECTED` / `LOGOUT` /
`ADMIN`. Deleting a user cascades their refresh tokens.

**Passwords.** Argon2id (`m=19456 KiB, t=2, p=1, out=32`), PHC `$argon2id$…` only. Plaintext
is capped at 128 chars, never stored, never logged. There is **no** default/seeded account
and **no** public registration or self-service role assignment.

**Future clients.** For browser clients, prefer delivering the refresh token as an
`HttpOnly`, `Secure`, `SameSite=Strict` cookie so it is unreachable from JavaScript (this
phase uses a JSON body per `api-contract §3`; the cookie transport is a documented
follow-up, not yet wired). For Flutter clients, store tokens in the platform secure enclave
/ keystore (e.g. `flutter_secure_storage`) — a client-side requirement; Flutter is not
integrated here.

---

## Authorization foundation

[`src/security/guards.ts`](./src/security/guards.ts) provides reusable pieces for future
business endpoints (none of which are implemented yet):

- `authenticate` — bearer pre-handler that verifies the JWT **and** re-loads current
  status/role, populating a typed `request.user`.
- `requireRole(...roles)` — coarse role gate → 403.
- `resolveCallerProfileIds`, `canAccessStudent`, `canAccessTripAsDriver`,
  `assertCanAccessStudent` — resource-scope patterns (student→self, guardian→linked child
  with `canTrack`, driver→assigned trip, admin→any). Sensitive existence is masked with
  **404**, not 403. Staff passengers are never treated as students (ADR-022).

Frontend route guards are **never** the security boundary; every rule is enforced here.

---

## HTTP security

- **helmet** security headers on all responses.
- **CORS** explicit allowlist (`credentials:true`); empty list ⇒ CORS disabled; `*` rejected
  in production.
- **Rate limiting**: a coarse global limiter (300/min, `/health` exempt) plus a strict
  per-route limiter on login/refresh (`AUTH_RATE_LIMIT_*`), keyed by client IP, returning
  the `RATE_LIMITED` envelope with `Retry-After`.
- **Body limit** 1 MiB; **`trustProxy`** off by default (conservative behind-proxy posture).
- **Errors**: centralized handler maps `AppError`, Zod, Fastify, and Prisma (`P2xxx`) errors
  to stable codes; 5xx messages/stacks and SQL are never sent to clients (logged with the
  request id instead).

---

## Testing

`npm test` runs [`test/auth.test.ts`](./test/auth.test.ts) — all **14** required scenarios —
through `app.inject()` against a dedicated **`viafast_test`** database.

- [`test/global-setup.ts`](./test/global-setup.ts) creates `viafast_test` (if absent) via the
  `postgres` maintenance DB and runs `prisma migrate deploy` against it. It **never**
  touches, resets, or drops `viafast_dev`.
- [`vitest.config.ts`](./vitest.config.ts) derives the test `DATABASE_URL` from your `.env`
  by swapping **only** the database name (no hard-coded credentials) and sets `NODE_ENV=test`.
- **Safety net:** `config/env.ts` refuses to boot when `NODE_ENV=test` and the DB name does
  not contain `test`, so the suite cannot run against a non-test database.
- Fixtures are synthetic, namespaced per run, and cleaned up in `afterAll`. Each request uses
  a unique source IP so per-IP rate-limit counters never leak between tests.

Scenarios: health; successful login; invalid password; nonexistent account (same generic
401); suspended account (same generic 401); missing/malformed access token; valid token +
`/me`; expired access token; refresh rotation (hash-only persistence asserted); reuse of a
rotated token (family revoked); logout + revocation (idempotent); rate limiting →
429; unauthenticated access to protected routes; safe error envelopes that leak no secrets.

---

## Developer user provisioning

There is **no** public registration and **no** seeded/default credential. An authorized
operator creates the first account with the dev-only CLI:

```bash
npm run provision:dev-user
```

It prompts for **email**, **primary role**, and a **masked password** (read from the TTY,
echoed as `*`, never printed, logged, or accepted as an argument). It hashes with Argon2id
and creates the user with `status = ACTIVE` (the activation step). Safeguards:

- Refuses to run when `NODE_ENV=production`, or when `DATABASE_URL` does not name a
  dev/test/local database.
- Aborts if the email already exists (never overwrites).
- `ADMIN` must be explicitly chosen **and** re-confirmed (never granted silently).
- Creates no role profile; `/me` `displayName` stays `null` until a profile exists.

---

## Database foundation (Phase 3, unchanged)

The canonical [`prisma/schema.prisma`](./prisma/schema.prisma) realizes `domain-model.md`.
Phase 4 added exactly one **new, additive** migration —
`20261013171820_add_refresh_tokens` (the `RefreshToken` table + `TokenRevokeReason` enum);
no existing table or migration was edited. Constraints Prisma can't express (partial unique
indexes, rider-XOR CHECKs) live as marked raw SQL at the end of the initial migration. See
the git history and `domain-model.md` for the full integrity rationale.

**Migration status:** both migrations are applied and `prisma migrate status` reports
*"Database schema is up to date!"* for `viafast_dev`; `viafast_test` is migrated by the test
global-setup.

---

## Security limitations & remaining risks

- **In-memory rate limiting** (single node). A multi-instance deployment needs a shared
  store (e.g. Redis) before this is effective horizontally.
- **Per-IP** limiting only; account-level throttling/lockout (contract §10) is a follow-up.
- **Access tokens are not revocable** before expiry (stateless JWT); mitigation is the short
  15-min TTL plus per-request status re-check. A token denylist (`jti`) is a future option.
- **Refresh transport** is a JSON body here; the `HttpOnly`/`Secure`/`SameSite` cookie path
  for browser clients is documented but not yet implemented.
- **Argon2 parameters** are modest for dev/CI responsiveness; raise `memoryCost`/`timeCost`
  for production via `src/security/password.ts`.
- No CSRF protection is needed for the current bearer-token/body model, but must be added if
  the cookie transport is adopted for browsers.
