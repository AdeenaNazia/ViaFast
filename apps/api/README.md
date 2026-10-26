# @viafast/api — Backend Foundation, Authentication & Student Transport API (Phases 3–5)

Node.js + TypeScript + **Fastify** backend for the ViaFast campus-transport platform,
built on the **Prisma 7** / PostgreSQL foundation from Phase 3. Phase 4 added a
runnable, tested HTTP server with **secure authentication and an authorization
foundation**; Phase 5 adds the first real transport-domain surface: the **Student
read API**, served from live PostgreSQL rows through Prisma.

> **Scope — backend foundation, auth, and the Student surface ONLY.**
> Implemented: `GET /health`, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`,
> `POST /api/v1/auth/logout`, `GET /api/v1/me`, and the Student endpoints
> `GET /api/v1/me/ride`, `GET /api/v1/me/ride/history` (alias `GET /api/v1/me/trips`),
> `GET /api/v1/me/notifications`.
> Intentionally **NOT** here yet: Parent and Driver endpoints, route/vehicle/fee/
> incident administration, WebSockets, GPS-provider integration, push notifications,
> and any Flutter/React client wiring. The React admin (`/src`) and the Flutter app
> (`/apps/mobile`) are **untouched**.

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

To exercise the **Student** endpoints by hand you also need a Student that can log in and
has a ride *today*. `prisma/seed.ts` cannot supply one (every seeded `passwordHash` is
NULL, and its trips are dated 2026-03-02), so use the dedicated synthetic fixture:

```bash
# Put a password of your own in .env first (never commit it, never pass it as an argument):
#   VIAFAST_DEV_STUDENT_PASSWORD="..."
npm run provision:dev-student   # idempotent; dev databases only
```

That creates `dev.student@viafast.test` (student number `DEV-STU-0001`) with an ACTIVE
assignment, today's inbound + return trips, one boarding event and one notification. See
[Development Student fixture](#development-student-fixture-manual-api-testing) below.

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
| `npm test` | `vitest run` — the full suite (49 tests) against an isolated **`viafast_test`** DB. |
| `npm run test:watch` | `vitest` in watch mode. |
| `npm run provision:dev-user` | Interactive, **development-only** user provisioning CLI. |
| `npm run provision:dev-student` | Idempotent, **development-only** synthetic Student + current-day ride fixture. |
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
| `VIAFAST_DEV_STUDENT_PASSWORD` | *for `provision:dev-student`* | – | Read **only** by that script; the API never reads it. No default exists. |

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
│  ├─ common/pagination.ts   # opaque keyset cursors + {data,page} envelope (§1.5)
│  ├─ common/time.ts         # campus-zone service date, @db.Date / @db.Time rendering
│  ├─ errors/app-error.ts    # ErrorCode ↔ HTTP envelope (§1.4)
│  ├─ security/              # password (argon2id), tokens (jose JWT + opaque refresh), guards
│  ├─ validation/validate.ts # Zod → VALIDATION_FAILED envelope
│  ├─ dev/provision-dev-student.ts # synthetic dev Student fixture (library; no side effects on import)
│  └─ modules/
│     ├─ auth/               # schemas, refresh-token repository, service, routes
│     ├─ users/              # users.service (safe principal), me.routes
│     ├─ student/            # schemas, service (read models), routes — Phase 5
│     └─ health/             # health.routes
├─ scripts/provision-dev-user.ts
├─ scripts/provision-dev-student.ts
├─ test/                     # global-setup.ts (creates+migrates viafast_test), auth.test.ts, student.test.ts, dev-provisioning.test.ts
├─ vitest.config.ts
├─ prisma/                   # schema.prisma, seed.ts, migrations/
└─ generated/prisma/         # generated client (git-ignored)
```

`buildApp()` returns a configured instance **without listening**, so tests drive it with
`app.inject()` and `server.ts` binds it to a port. Cross-cutting order: prisma →
request-id → security → error handling → routes.

---

## Endpoints

| Method & path | Auth | Behavior |
|---|---|---|
| `GET /health` | public | Liveness (`status:"ok"`) + DB readiness (`database:"up"\|"down"`). Rate-limit exempt. No internals. |
| `POST /api/v1/auth/login` | public | `{identifier,password}` → 200 token pair, or **generic** 401. Strictly rate-limited. |
| `POST /api/v1/auth/refresh` | public | `{refreshToken}` → 200 rotated pair; 401 on expired/revoked/reused. Strictly rate-limited. |
| `POST /api/v1/auth/logout` | bearer | Optional `{refreshToken}` → revoke that family; absent → revoke all of the caller's. Always 204, idempotent. |
| `GET /api/v1/me` | bearer | Safe principal + role-profile summary; plus `activeAssignment` for student callers. Re-checks current status. |
| `GET /api/v1/me/ride` | bearer · STUDENT | The caller's current effective transport context: profile, term, assignment, ordered route stops, pickup/drop stops, today's inbound + return trips with vehicle/driver, and `journeyStatus`. |
| `GET /api/v1/me/ride/history` | bearer · STUDENT | Paged boarding/journey history. `?limit=&cursor=&from=&to=`. |
| `GET /api/v1/me/trips` | bearer · STUDENT | **Alias** of `/me/ride/history` — same handler, same response. |
| `GET /api/v1/me/notifications` | bearer · STUDENT | Paged notifications visible to the caller, with per-viewer `read` state. `?limit=&cursor=`. |

Paths follow `api-contract.md` (base `/api/v1`); `/health` is an unversioned infra probe.
All non-2xx use the contract envelope `{error:{code,message,requestId,details?}}` and every
response carries `X-Request-Id`. List endpoints use the §1.5 cursor envelope
`{data:[…], page:{nextCursor, hasMore}}` (default limit 25, max 100).

> **`/me/ride/history` vs `/me/trips`.** `api-contract.md` names the endpoint
> `/me/ride/history`. Both paths are registered on one shared handler, so the canonical
> contract path and the short client-facing name behave identically. There is no second
> implementation to drift.

> **`GET /me` narrowing (updated in Phase 5).** The contract's `/me` example also shows
> `currentTripId` and `linkedStudents`. `activeAssignment` is now included — but **only**
> for a caller whose linked role profile is a `StudentProfile`, and only as the four ids
> the contract specifies (`id`, `routeId`, `pickupStopId`, `dropStopId`); the route, stop
> and trip detail lives in `/me/ride`. When there is no current assignment the key is
> **absent** rather than null, so the shape stays stable. `currentTripId` and
> `linkedStudents` remain deferred (they belong to the Parent surface and to trip
> selection that `/me/ride` already answers).

---

## Student API (Phase 5)

### Documented behaviors

| Situation | Response |
|---|---|
| No access token / invalid / expired / user no longer ACTIVE | **401** `UNAUTHENTICATED` |
| Valid token, `primaryRole` ≠ `STUDENT` | **403** `FORBIDDEN` |
| `STUDENT` role but no `StudentProfile` row | **403** `FORBIDDEN` — there is nothing to scope a query to |
| Student with no current assignment | **200** with `term:null`, `assignment:null`, `trips:{inbound:null,return:null}`, `journeyStatus:null`. Nothing is fabricated. |
| Assignment exists but outside its effective window / soft-deleted / not `ACTIVE` | Treated as **no current assignment** (the 200 empty state above) |
| Assignment but no trips for today | **200**; `trips` entries are `null`, `journeyStatus` is `null` |
| No trip history / no visible notifications | **200** `{data:[], page:{nextCursor:null, hasMore:false}}` |
| `limit` outside 1–100, non-integer, malformed `cursor`, bad `from`/`to`, `from` > `to` | **400** `VALIDATION_FAILED` with per-field `details` |

### What is deliberately *not* returned

- **`tracking` is always `null`.** The contract reserves that slot for the
  `VehicleTrackingView` projection (domain-model §5.3), which needs a TrackingProvider plus
  the position/occupancy/ETA services. None exist yet (ADR-001/ADR-007/ADR-009) and the
  database holds no live GPS feed, so the key is present-but-null instead of being filled
  with invented telemetry. The seed's `SIMULATED` `LocationUpdate` rows are **not** surfaced.
- **Driver PII.** The driver projection is exactly `{id, fullName, ratingAvg}` — never
  `phoneE164`, `licenseNumber`, `licenseClass` or `experienceYears`.
- **No Prisma model is serialized directly.** Every response is built by an explicit DTO
  mapper in `student.service.ts`, so an internal column cannot leak by accident.
- **No fee data.** Nothing reads `FeeInvoice`/`Installment`/`Payment`; no balance is
  derived or implied (ADR `[UNRESOLVED-OPS]`).

### Authorization

Every Student route runs `authenticate` → `requireRole(STUDENT)` → `requireStudentContext`.
The student identity is resolved **only** from `StudentProfile.userId` (the unique 1:1 link)
for the authenticated user id. No path, body or query parameter can select whose data is
returned: a client-supplied `studentId`, `userId`, `role` or `audienceRole` is ignored
(unknown query params are stripped by Zod before any database work). Student numbers,
names, phone numbers and route labels are never used as keys (ADR-002).

There is **no admin bypass** on these routes. The contract routes admin and parent access
to a student's data through separate `/admin/*` and `/me/children/{studentId}/ride`
endpoints, which are out of scope here.

Notification visibility is the AND of three gates — role (`audienceRole` is null or the
caller's role), ownership (`studentId` is null or the caller's profile), and relevance (a
personally-addressed notification passes; otherwise each transport ref must resolve to the
route of the caller's active assignment). `realtime-contract.md` §6.6 phrases delivery as
"audience match **or** authorized ref"; the narrower AND composition is used because
over-exposure is a privacy defect while under-exposure is only a relevance one — the literal
OR would leak a `audienceRole=PARENT` route alert to every rider on that route.

### Time handling

`Trip.serviceDate` is a pure calendar day (`@db.Date`) interpreted in the campus zone
**Asia/Karachi** (ADR-019), so "today" is computed with `campusServiceDate()` rather than
the server's local date. `RouteStop.scheduled*Time` is a wall-clock `@db.Time` rendered as
`HH:MM`. Instants go on the wire as ISO-8601 UTC.

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

[`src/security/guards.ts`](./src/security/guards.ts) provides the reusable pieces every
business endpoint composes:

- `authenticate` — bearer pre-handler that verifies the JWT **and** re-loads current
  status/role, populating a typed `request.user`.
- `requireRole(...roles)` — coarse role gate → 403.
- `resolveCallerProfileIds`, `canAccessStudent`, `canAccessTripAsDriver`,
  `assertCanAccessStudent` — resource-scope patterns (student→self, guardian→linked child
  with `canTrack`, driver→assigned trip, admin→any). Sensitive existence is masked with
  **404**, not 403. Staff passengers are never treated as students (ADR-022).

In use today: `authenticate` + `requireRole(STUDENT)` guard all four Student routes, and
`requireStudentContext` (`src/modules/student/student.service.ts`) supplies the resource
scope. `canAccessStudent` / `assertCanAccessStudent` remain unexercised — they serve the
Parent surface, which is not implemented yet.

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

`npm test` runs three files — **49 tests** in total — through `app.inject()` against a
dedicated **`viafast_test`** database:

- [`test/auth.test.ts`](./test/auth.test.ts) — the **14** Phase 4 auth scenarios.
- [`test/student.test.ts`](./test/student.test.ts) — **16** Student API tests covering the
  11 required Phase 5 scenarios.
- [`test/dev-provisioning.test.ts`](./test/dev-provisioning.test.ts) — **19** tests for the
  synthetic development Student fixture.

- [`test/global-setup.ts`](./test/global-setup.ts) creates `viafast_test` (if absent) via the
  `postgres` maintenance DB and runs `prisma migrate deploy` against it. It **never**
  touches, resets, or drops `viafast_dev`.
- [`vitest.config.ts`](./vitest.config.ts) derives the test `DATABASE_URL` from your `.env`
  by swapping **only** the database name (no hard-coded credentials) and sets `NODE_ENV=test`.
- **Safety net:** `config/env.ts` refuses to boot when `NODE_ENV=test` and the DB name does
  not contain `test`, so the suite cannot run against a non-test database.
- Fixtures are synthetic, namespaced per run, and cleaned up in `afterAll` in FK-safe order
  (several relations are `onDelete: Restrict`). Each request uses a unique source IP so
  per-IP rate-limit counters never leak between tests. After a green run `viafast_test` is
  verified empty of fixture rows, and the suite never writes to `viafast_dev` at all.
  `dev-` rows in `viafast_dev` come only from `npm run provision:dev-student`.

Auth scenarios: health; successful login; invalid password; nonexistent account (same generic
401); suspended account (same generic 401); missing/malformed access token; valid token +
`/me`; expired access token; refresh rotation (hash-only persistence asserted); reuse of a
rotated token (family revoked); logout + revocation (idempotent); rate limiting →
429; unauthenticated access to protected routes; safe error envelopes that leak no secrets.

Student scenarios: unauthenticated → 401 on all three endpoints (including a well-formed
token for a nonexistent user); a valid student retrieves the full ride context (stops in
inbound order, `HH:MM` clock times, vehicle + driver projection, `tracking: null`,
`journeyStatus` from the latest boarding event); a student with no active assignment gets the
documented 200 empty state; an assignment closed by `effectiveTo` is not treated as current;
a STUDENT-role account with no profile → 403; a PARENT-role caller → 403; cross-student
isolation of ride/history/notifications; client-supplied `studentId`/`userId`/`role`/
`audienceRole` query params are ignored; history scoping, keyset pagination across a page
boundary, `from`/`to` filtering, no duplicate trips for a trip with multiple boarding
events, and the `/me/ride/history` alias matching `/me/trips` byte-for-byte; notification
scoping through all three gates with per-viewer `read` state; empty-collection envelopes;
twelve invalid-pagination/filter inputs → 400 with per-field details; every payload checked
recursively for forbidden keys (`passwordHash`, `tokenHash`, `refreshToken`, `accessToken`,
`phoneE164`, `licenseNumber`, `userId`, …) and for raw secret material; `GET /me` gains
`activeAssignment` for a student and nothing else.

Dev-provisioning scenarios: the target guard as a pure function (production, missing
`DATABASE_URL`, unrecognisable database name, accepted dev/test/local names); refusal
**before any write** under a production configuration and against a non-development
database; rejection of an under-length password; abort — never hijack — when another
account already holds the fixture email; the stored hash is `$argon2id$…` and is neither
the plaintext nor contained in it; login through the real `POST /auth/login` succeeds and
a wrong password still yields the generic 401; the issued token reaches `/me`, `/me/ride`
(today's trips, `tracking: null`, `journeyStatus: "BOARDED"`, no driver PII), `/me/trips`
and its `/me/ride/history` alias (identical bodies), and `/me/notifications`; idempotency
across three runs (no row added, `alreadyProvisioned` flips to `true`, password rotation
takes effect); and no unrelated account, fee, installment, payment, location or ETA record
is created or modified.

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

## Development Student fixture (manual API testing)

`prisma/seed.ts` is intentionally credential-free — every `passwordHash` it writes is NULL
(ADR-024: Phase 3 was schema support only) — and its trips are dated **2026-03-02**. So no
seeded account can log in, and `GET /me/ride` returns its empty state for today. That makes
the Student surface impossible to exercise by hand.

Rather than couple a credential to the whole seed dataset, a **separate, opt-in** fixture
provisions one clearly-designated synthetic Student:

```bash
npm run provision:dev-student
```

Implemented by [`src/dev/provision-dev-student.ts`](./src/dev/provision-dev-student.ts)
(the logic, importable and side-effect-free) and
[`scripts/provision-dev-student.ts`](./scripts/provision-dev-student.ts) (the CLI).

### Configuring the password safely

There is **no** default password anywhere in the repository, and the script accepts none as
an argument (which would land in shell history). It reads exactly one variable:

```bash
# apps/api/.env  (gitignored — never commit this)
VIAFAST_DEV_STUDENT_PASSWORD="your-local-only-password"   # 8..128 characters
```

or, for a single command:

```bash
VIAFAST_DEV_STUDENT_PASSWORD='your-local-only-password' npm run provision:dev-student
```

Only the **Argon2id hash** produced by the same `hashPassword()` the API verifies against is
persisted. Neither the plaintext nor the hash is printed, logged, or returned. Re-running
with a different value rotates the stored hash — that is the intended way to change it.

### What it creates

Every row is owned by the fixture and identified by a `dev-` id prefix and `(SYNTHETIC)`
labels, so it is trivially distinguishable from seeded or hand-made data.

| Record | Id | Notes |
|---|---|---|
| `User` | `dev-u-student` | `dev.student@viafast.test`, `STUDENT`, `ACTIVE`, Argon2id hash. `phoneE164` left NULL. |
| `StudentProfile` | `dev-sp-student` | `DEV-STU-0001`, "Dev Student (SYNTHETIC)", `enrollmentStatus: ACTIVE`. |
| `Term` | `dev-term` | `DEV-TERM`; window relative to today (−30d … +180d). |
| `Route` | `dev-rt` | `DEV-R1`, "Dev Corridor (SYNTHETIC)". |
| `RouteStop` ×3 | `dev-st-1..3` | Sequences 1–3, inbound 07:00/07:20/07:45, return 17:30/17:10/16:50 (Asia/Karachi). **Coordinates are `0,0` on purpose** — this corridor was never surveyed, and a plausible real coordinate would be a fabricated position. |
| `Vehicle` | `dev-veh` | `DEV-SYNTH-0001`, COASTER, 22 seats. |
| `DriverProfile` | `dev-drv` | "Dev Driver (SYNTHETIC)". No `User` row and `ratingAvg` NULL — no second credential, no invented score. |
| `RideAssignment` | `dev-asg` | `ACTIVE`, open-ended, pickup stop 2 → drop stop 3. |
| `Trip` ×2 | `dev-trip-in-YYYYMMDD` / `dev-trip-ret-YYYYMMDD` | **Today's** campus service date, INBOUND `IN_PROGRESS` + RETURN `SCHEDULED`. |
| `BoardingEvent` | `dev-be-in-YYYYMMDD` | `BOARDED`, `source: SYSTEM` (never `DRIVER` — no crew action is implied). This is what makes history and `journeyStatus` non-empty. |
| `Notification` | `dev-not-1` | Personally addressed to `dev-sp-student`, so the ownership gate hides it from every other student. |

**Deliberately absent:** no `FeeInvoice`, `Installment` or `Payment` (no authoritative
balance is fabricated — ADR-018), and no `LocationUpdate` or `EtaEstimate`. `tracking`
therefore stays `null` exactly as it does for every other rider; nothing here makes tracking
look live (ADR-001/007/009).

### Safety guarantees

- **Refuses to run** when `NODE_ENV=production`, when `DATABASE_URL` is unset, or when the
  database name does not match `dev|test|local`. The check happens **before** any write.
- **Owns only `dev-` rows.** Every statement is keyed by one of those ids, so no other user,
  profile, assignment, trip, invoice or notification can be selected or updated.
- **Aborts rather than hijacks.** If the fixture email or student number is already held by a
  *different* row, it throws and writes nothing.
- **Idempotent.** All writes are `upsert` on stable ids; trip and boarding-event ids encode
  the service date. Re-running adds no duplicate, and the next calendar day simply adds that
  day's pair (earlier days become history).
- **`prisma/seed.ts` is unchanged**, no schema change and no migration is involved, and no
  applied migration was edited.

### Manual test sequence

```bash
npm run provision:dev-student     # once, or again any day you want a current ride
npm run dev                       # → http://127.0.0.1:8080
```

```bash
# 1. Log in through the real endpoint (no bypass, no special route).
TOKEN=$(curl -s -X POST http://127.0.0.1:8080/api/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"identifier":"dev.student@viafast.test","password":"<your-local-password>"}' \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).accessToken))')

# 2. Who am I?  → primaryRole STUDENT + the linked student profile
curl -s http://127.0.0.1:8080/api/v1/me -H "authorization: Bearer $TOKEN"

# 3. Today's ride: assignment, ordered stops, inbound + return trips, journeyStatus BOARDED,
#    tracking null.
curl -s http://127.0.0.1:8080/api/v1/me/ride -H "authorization: Bearer $TOKEN"

# 4. History (both paths are the same handler) — one IN_PROGRESS item for today.
curl -s "http://127.0.0.1:8080/api/v1/me/trips?limit=10" -H "authorization: Bearer $TOKEN"
curl -s "http://127.0.0.1:8080/api/v1/me/ride/history?limit=10" -H "authorization: Bearer $TOKEN"

# 5. Notifications — the synthetic, personally-addressed one, read:false.
curl -s "http://127.0.0.1:8080/api/v1/me/notifications?limit=10" -H "authorization: Bearer $TOKEN"

# 6. Negative paths still behave: wrong password → generic 401; no token → 401.
curl -s -X POST http://127.0.0.1:8080/api/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"identifier":"dev.student@viafast.test","password":"definitely-wrong"}'
curl -s http://127.0.0.1:8080/api/v1/me/ride
```

The fixture is additive and reversible. To remove it, delete the `dev-` rows in FK order
(notification → boarding event → trip → ride assignment → route stop → route → vehicle →
driver profile → term → student profile → user); `test/dev-provisioning.test.ts` does exactly
that in its hooks.

> **This is a development affordance, not a security change.** It closes ADR-026 follow-up
> risk **6** ("no synthetic Student account can authenticate") and nothing else. The separate
> gap where `StudentProfile.enrollmentStatus` is reported but **not** enforced by the Student
> guards — ADR-026 follow-up risk **1** — is deliberately **not** addressed here and needs its
> own change with its own tests. The fixture sets `enrollmentStatus: ACTIVE` only so it is a
> normal, unremarkable rider rather than the thing that happens to exercise that gap.

---

## Database foundation (Phase 3, unchanged)

The canonical [`prisma/schema.prisma`](./prisma/schema.prisma) realizes `domain-model.md`.
Phase 4 added exactly one **new, additive** migration —
`20261013171820_add_refresh_tokens` (the `RefreshToken` table + `TokenRevokeReason` enum);
no existing table or migration was edited. Constraints Prisma can't express (partial unique
indexes, rider-XOR CHECKs) live as marked raw SQL at the end of the initial migration. See
the git history and `domain-model.md` for the full integrity rationale.

**Phase 5 added no schema change and no migration** — and neither did the development
Student fixture, which writes data rows only. The Student API is served entirely
from the existing tables (`StudentProfile`, `Term`, `Route`, `RouteStop`, `RideAssignment`,
`Trip`, `BoardingEvent`, `Vehicle`, `DriverProfile`, `Notification`, `NotificationRead`).
No field or relationship was invented to make an endpoint easier, and no applied migration
was edited.

**Migration status:** both migrations are applied and `prisma migrate status` reports
*"Database schema is up to date!"* for `viafast_dev`; `viafast_test` is migrated by the test
global-setup.

> **Note on the dev database.** `viafast_dev` is migrated but ships **empty** —
> `prisma/seed.ts` has never been run against it. The Student endpoints therefore return
> their documented empty states there until you run `npm run provision:dev-student` (one
> synthetic, login-capable Student with a ride for today), `npm run db:seed` (a broader
> synthetic dataset, but **no** credentials), or provision real rows.

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

### Student API (Phase 5)

- **No live tracking.** `tracking` is permanently `null` until a TrackingProvider and the
  position/occupancy/ETA services exist. Clients must not render a "live" indicator from
  this API. Realtime delivery (WebSockets) is not implemented, so the Student surface is
  poll-only.
- **`journeyStatus` and history `outcome` are derived**, not stored: both collapse a rider's
  append-only `BoardingEvent` rows to their latest event (domain-model §4.4). If events stop
  arriving, the derived value stops changing — there is no independent completion signal.
- **Notification visibility is narrower than `realtime-contract.md` §6.6 read literally**
  (AND of role + ownership + relevance rather than OR). See the reasoning in
  `notificationVisibilityWhere`. If the OR reading is the intended contract, that is a
  documented decision to revisit — but changing it would widen exposure, so it should not be
  done casually.
- **No notification read/write endpoint.** `read` is reported from `NotificationRead`, but
  nothing marks a notification read yet; there is no `POST /me/notifications/{id}/read`.
- **History covers only trips with a boarding event.** A scheduled trip the rider never
  boarded and was never recorded on does not appear in `/me/ride/history`.
- **No term filter** on history or notifications — `api-contract.md` defines only
  `limit`/`cursor`/`from`/`to`, so none was invented.
- **`GET /me/ride` is poll-shaped**, issuing up to three queries per call (assignment, today's
  trips, latest boarding event). At real scale this wants caching or the realtime channel.
