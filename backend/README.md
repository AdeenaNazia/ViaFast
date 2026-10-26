# ViaFast Backend — Foundation (Phase 3 + Phase 4A + Phase 4B)

> **Status: non-authoritative reference implementation.** Per
> [ADR‑026](../docs/architecture/architecture-decisions.md), **`apps/api/` is the
> sole authoritative ViaFast backend** — all new API, schema, and migration work
> happens there. This directory is **retained**: it is not deleted, renamed, or
> moved, and it is inspected selectively for parts worth reusing (Docker Compose
> PostgreSQL, the non-root `Dockerfile`, the ESLint/Prettier baseline, the
> `engines` floor, and the seed pipeline's transform/persist split). It takes no
> new features. Read ADR‑026 before copying any model, migration, enum, or
> service from here — its enums and staff/fee handling conflict with ADR‑022 and
> ADR‑018.

NestJS (TypeScript, strict) modular monolith for the ViaFast university transport
platform. Phase 3 delivered the infrastructure: configuration, health check,
PostgreSQL via Docker Compose, Prisma wiring, structured logging, error
handling, security baseline, and a test foundation. Phase 4A added the
**database domain model**: this backend's Prisma schema and initial
migration (`init_domain`). Phase 4B added the **deterministic seed** that
transforms the existing frontend demo data (`src/data/initialData.ts`, never
edited) into the domain model via `npm run db:seed`.

The React application stays untouched at the repository root. No auth, no GPS
ingestion, no realtime, no service/domain APIs, and no Flutter code exist yet
by design — see the Phase 2 Target Architecture Specification.

## Prerequisites

- Node.js >= 20 (developed on Node 24)
- Docker Desktop (PostgreSQL 16 runs in Compose)
- npm

## Quickstart

```bash
cd backend
cp .env.example .env      # then adjust if needed
npm install               # then run `npm run prisma:generate`
npm run db:up             # start PostgreSQL 16 in Docker
npm run db:migrate        # apply migrations (creates the domain schema)
npm run db:seed           # seed the domain data (idempotent, safe to re-run)
npm run start:dev         # API on http://localhost:3001
```

Health check:

```bash
curl http://localhost:3001/health
# {"status":"ok","environment":"development","database":"connected","timestamp":"..."}
```

`database` reads `connected` when PostgreSQL is reachable, `unavailable`
otherwise. The endpoint always returns HTTP 200 (liveness); the database field
carries the availability detail. A dedicated readiness probe can be added in a
later phase.

## Commands

| Command             | Purpose                                      |
| ------------------- | -------------------------------------------- |
| `npm run db:up`     | Start PostgreSQL 16 (docker compose, `-d`)   |
| `npm run db:down`   | Stop the database (volume persists)          |
| `npm run db:logs`   | Follow database logs                         |
| `npm run db:migrate` | Create/apply migrations (`prisma migrate dev`) |
| `npm run db:migrate:deploy` | Apply migrations without prompts (CI/prod) |
| `npm run db:migrate:status` | Show migration status                |
| `npm run db:seed`  | Seed the domain data (idempotent; `--dry-run` supported) |
| `npm run db:studio` | Prisma Studio (browse data)                  |
| `npm run start:dev` | Dev server with watch mode (port from `.env`)|
| `npm run start:prod`| Run the compiled build (`node dist/main.js`) |
| `npm run build`     | Compile to `dist/` (uses `tsconfig.build.json`) |
| `npm run typecheck` | `tsc --noEmit` over src + test               |
| `npm run lint`      | ESLint (flat config), zero warnings allowed  |
| `npm run format`    | Prettier write                               |
| `npm test`          | Unit tests (Jest, no database needed)        |
| `npm run test:e2e`  | E2E tests (supertest, no database needed)    |
| `npm run prisma:generate` | Regenerate the Prisma client           |

## Environment

Copy `.env.example` to `.env` (gitignored). Keys:

- `NODE_ENV` — `development` | `test` | `production` (default `development`)
- `PORT` — HTTP port (default `3001`; the frontend dev server uses 3000)
- `DATABASE_URL` — PostgreSQL connection string (required)
- `CORS_ORIGINS` — comma-separated allowed origins; unset/empty/`*` allows all
- `POSTGRES_*` — used only by `docker-compose.yml`

`src/config/env.validation.ts` validates `NODE_ENV`, `PORT`, and the presence
of `DATABASE_URL` at boot and fails fast with a key-level error list. Values
are never logged; connection strings must never appear in logs or responses.

## Database schema (Phase 4A)

`prisma/schema.prisma` is this backend's domain model (superseded by
`apps/api/prisma/schema.prisma` per ADR‑026); migrations live in
`prisma/migrations/` (initial: `20261011100000_init_domain`). Conventions:
UUID primary keys generated database-side (`gen_random_uuid()`), `timestamptz`
timestamps, double-precision lat/lng (no PostGIS yet), and money strictly as
**integer paisa** (`*Minor` integer columns). Tables are `@@map`-ed to
snake_case; Prisma field names stay camelCase.

High-level entity overview:

- **Identity** — `User` (role/status enums, no credential fields yet) with
  `StudentProfile` (roll number, rider type STUDENT/STAFF), `ParentProfile`,
  `DriverProfile`; `Guardianship` is the many-to-many guardian ↔ student link.
- **Fleet & corridors** — `Vehicle` (registration, capacity, status),
  `Route`, `Stop` (lat/lng, address), `RouteStop` (ordered, unique per route
  and per sequence, optional timing offset/distance), `Schedule`
  (MORNING/RETURN, departure minutes-since-midnight).
- **Operations** — `Trip` (route + optional schedule + vehicle + optional
  driver, service date, PLANNED/ACTIVE/COMPLETED/CANCELLED), `TripStop`
  (snapshot of the stop list), `TripPassenger`
  (ASSIGNED/PICKED_UP/ABSENT/DROPPED_OFF), `TransportAssignment` (standing
  rider → route/stop/direction).
- **Tracking (persistence only)** — `TrackingSession` (vehicle + provider +
  device, start/end), `GpsReading` (bigserial telemetry with device
  `recordedAt` vs server `receivedAt`, idempotent per
  `(session, clientEventId)`), `VehiclePosition` (live cache, one row per
  vehicle).
- **Incidents & notifications** — `Incident` (type/severity/status lifecycle,
  optional trip/vehicle/route/reporter links), `Notification` (recipient,
  typed, `readAt` NULL = unread, optional trip/incident/invoice links).
- **Fees & payments** — `FeeDefinition`, `Invoice` (obligation per rider),
  `Payment` (method/status/external reference; never card data).

Deletion is intentional everywhere: operational history is `Restrict`
(vehicles ↔ trips/tracking, students ↔ invoices/passenger history), caches and
owned children `Cascade`, soft references `SetNull`. `prisma/studio`
(`npm run db:studio`) is the quickest way to browse data locally.

## Database seed (Phase 4B)

```bash
cd backend
npm run db:up             # PostgreSQL 16 in Docker (prerequisite)
npm run db:migrate        # apply init_domain (prerequisite)
npm run db:seed           # seed + verify; safe to re-run any number of times
npm run db:seed -- --dry-run   # build and print the plan; no database access
```

The seed transforms the **existing frontend demo data** — the source of truth
is `src/data/initialData.ts` at the repository root, which the seed reads at
runtime and **never modifies** — into the Phase 4A domain model. The pipeline
is `prisma/seed.ts` (runner) → `prisma/seed/source.ts` (structural contract +
runtime loader) → `prisma/seed/transform.ts` (pure, deterministic, unit
tested) → `prisma/seed/persist.ts` (idempotent writes in one transaction) →
`prisma/seed/verify.ts` (post-seed count + relationship checks derived from
the plan, never hardcoded).

### Expected counts (from the current source data)

| Model                  | Rows | Notes                                            |
| ---------------------- | ----:| ------------------------------------------------ |
| `User`                 |    24| 10 riders + 8 guardians + 6 drivers (placeholder identities) |
| `StudentProfile`       |    10| 8 students + 2 staff (riderType STAFF)           |
| `ParentProfile`        |     8| deduplicated by phone                            |
| `Guardianship`         |     8| all primary; replaces `parentPhone` matching     |
| `DriverProfile`        |     6|                                                  |
| `Vehicle`              |     6| Coaster ×5 + Bus ×1 (incl. reserve)              |
| `Stop`                 |    64| deduplicated by (name, lat, lng) from 72 entries |
| `Route`                |     5| source ids kept as `Route.code`                  |
| `RouteStop`            |    72| source ordering preserved exactly (1..N)         |
| `Schedule`             |    10| MORNING + RETURN per route                       |
| `TransportAssignment`  |    10| 8 riders (both directions) + 2 staff (scoped)    |
| `Trip`                 |     5| synthetic current-day fixtures (2026-10-12)      |
| `TripStop`             |    72| full stop-list snapshot per fixture trip         |
| `TripPassenger`        |    10| current-day journey state                        |
| `FeeDefinition`        |     1| PKR 55,000 → 5,500,000 paisa                     |
| `Invoice`              |     8| students only; status from feePaid/feeStatus     |
| `Payment`              |     8| demo fixtures (see below)                        |

Intentionally **empty**: `TrackingSession`, `GpsReading`, `VehiclePosition`
(no fake telemetry — Phase 7 owns tracking), `Incident` (none in source),
`Notification` (never manufactured — Phase 13 owns them).

### Mapping rules (frontend → domain)

- **Identity**: the source carries no emails, so seeded `User` rows get
  placeholder emails at `@seed.viafast.example` (RFC 2606 reserved domain).
  These are explicitly **not real identities**; the auth phase replaces them.
  No credentials, no passwords. Staff riders keep platform role STUDENT — the
  student/staff distinction lives in `StudentProfile.riderType`.
- **Natural keys**: source ids are never primary keys. Rows are keyed on
  `rollNumber` (riders; staff use `staffId`), `licenseNumber` (drivers),
  `registrationNumber` + `code` (vehicles), `Route.code` (routes, value =
  source route id as an external reference).
- **Stops**: deduplicated by (name, lat, lng) — the same physical stop is
  reused across routes, but a same-name/different-coordinates stop stays
  distinct; nothing merges silently.
- **Schedules**: MORNING departs at `route.morningStartTime`; RETURN departs
  at the Campus stop's `returnTime`. Stop timings are stored only as
  `RouteStop.arrivalOffsetMinutes` (morning offsets); return stop times are
  derivable from the same corridor but not stored (single offset column by
  4A design).
- **Trips**: `INITIAL_ACTIVE_TRIPS` are synthetic **current-day fixtures**
  pinned to the fixed date 2026-10-12 (clearly labeled, no fake history).
  `TripStop` snapshots the full route stop list with the source's
  current-stop progress; `TripPassenger` carries the morning journey state.
- **Fees**: all money is integer paisa (PKR × 100). `feePaid` becomes a
  single demo `Payment` (method WALLET — the source records no channel)
  flagged with `externalReference = 'viafast-seed-demo-payment'` so demo rows
  are identifiable; real gateway references arrive with the payments phase.
  No card data anywhere.
- **Excluded from the seed** (no schema home / phase-owned): AI
  recommendations (ViaAI runtime artifacts), UI notifications, transport
  history (derivable), route-change requests (approval workflow phase).

### Idempotency

`db:seed` never deletes anything and is safe to re-run. Riders, guardians,
drivers, vehicles, routes, route stops, schedules, guardianships, trip
stops, and trip passengers use Prisma `upsert` on natural/unique keys.
`Stop`, `TransportAssignment`, `Trip`, `FeeDefinition`, `Invoice`, and
`Payment` have no schema-level natural unique (by 4A design), so they use
deterministic `findFirst`-then-create/update patterns. Re-runs converge the
database to the plan; the runner then verifies counts and relationships and
exits non-zero on any mismatch. The whole seed runs in a single transaction.

### Resetting local data (development only)

The seed deliberately has no delete/-reset mode. For a clean local redo:

```bash
cd backend
npm run db:down           # stop PostgreSQL
docker volume rm backend_viafast_pgdata   # DESTRUCTIVE: wipes local DB data
npm run db:up && npm run db:migrate && npm run db:seed
```

That volume removal is a **development-only destructive action** — it erases
every locally stored record and must never be pointed at shared data.

## API

### `GET /health`

```json
{
  "status": "ok",
  "environment": "development",
  "database": "connected",
  "timestamp": "2026-10-11T09:00:00.000Z"
}
```

Business endpoints will be versioned under `/api/v1` starting in Phase 4
(the global prefix is already configured; `/health` is excluded from it).

## Project structure

```
backend/
  src/
    main.ts                  # bootstrap
    app.module.ts            # root module
    app.setup.ts             # shared app configuration (also used by e2e tests)
    config/                  # typed env config + boot-time validation
    prisma/                  # global PrismaService (lazy connect)
    health/                  # GET /health
    common/
      filters/               # global exception filter (no internals leaked)
      interceptors/          # request logging (method/url/status/duration only)
  test/                      # e2e specs + jest config + env fallbacks
  prisma/schema.prisma       # this backend's domain model (Phase 4A; see ADR‑026)
  prisma/migrations/         # SQL migrations (init_domain)
  prisma/seed.ts             # seed runner (db:seed, --dry-run)
  prisma/seed/               # source contract, pure transform, persist, verify + unit tests
  docker-compose.yml         # PostgreSQL 16 + persistent volume + healthcheck
  Dockerfile                 # multi-stage production image
```

## Module boundaries

Implemented in Phase 3: `config`, `prisma` (infrastructure), `health`,
`common`. Planned modules — **not yet created** (no empty scaffolds by design):
`auth` (JWT + OTP), `users` (students/parents/drivers/admins), `routes`
(routes/stops/schedules), `trips`, `tracking` (GPS ingest + positions),
`viaai` (deterministic ETA + recommendations), `payments`, `notifications`,
`incidents`. Each begins as its own Nest module in a later phase.

## Testing

- `npm test` — unit tests (Jest + ts-jest). `test/setup-env.ts` supplies env
  fallbacks so the suite runs without a local `.env`. Includes the seed
  transform tests (`prisma/seed/*.spec.ts`), which run against local fixtures
  and never touch a database.
- `npm run test:e2e` — boots the full AppModule in-process via supertest and
  asserts `GET /health` returns the mandated payload and never leaks the
  connection string. No running database is required: the degraded path
  (`database: "unavailable"`) is part of the contract.

## Conventions

- TypeScript `strict: true` (backend only; the React app's tsconfig is separate
  and untouched).
- ESLint flat config with `typescript-eslint` recommended + `no-console`
  (use Nest's `Logger`), `@typescript-eslint/no-explicit-any` as error.
- Logging is structured and PII-safe: HTTP logs carry method, URL, status,
  duration — never request bodies, credentials, tokens, or OTPs.

## Troubleshooting

- **`docker: command not found`** — install Docker Desktop and start it before
  `npm run db:up`.
- **Port already in use** — change `PORT` in `.env`.
- **Prisma client out of date** — run `npm run prisma:generate`.
