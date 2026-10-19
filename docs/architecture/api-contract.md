# ViaFast — REST API Contract

Status: **Proposed contract** (design phase). No backend exists yet; nothing here is implemented.
Consumers: Flutter (Student/Parent/Driver), the retained React Admin Dashboard, and the future Node + TypeScript + Prisma backend.
Companion docs: [`domain-model.md`](./domain-model.md), [`realtime-contract.md`](./realtime-contract.md), [`data-integrity-audit.md`](./data-integrity-audit.md), [`architecture-decisions.md`](./architecture-decisions.md).

Field names match [`domain-model.md`](./domain-model.md) exactly. If a name is ambiguous, that doc wins.

---

## 1. Shared conventions

### 1.1 Base URL, versioning, environment
- Base path is versioned: **`/api/v1`**.
- The base **host** comes from environment config only. In the Flutter app it is `EnvConfig.apiBaseUrl` (currently `null` — the seam). **No URL, key, or secret is hardcoded** in client or server source; injected via env/`--dart-define` / server environment.
- `dev` and `prod` are distinct deployments; the client selects via flavor. See ADR‑012.

### 1.2 Content type & casing
- All requests/responses: `application/json; charset=utf-8`.
- **camelCase** JSON. IDs are ULID strings. Timestamps are **ISO‑8601 UTC** (`2026-10-11T07:15:00Z`). Money is an integer number of PKR (`amountPkr`).

### 1.3 Authentication
- Bearer token: `Authorization: Bearer <accessToken>` (short-lived JWT, 15 min) + a refresh token (httpOnly, secure, rotating). See [`realtime-contract.md`](./realtime-contract.md) §6 for WS auth and ADR‑013 for session lifecycle.
- Every authenticated response is scoped to the caller's `User` and re-authorized against the target resource. **A valid token proves identity, not access to a given student/trip.**
- **Prototype note:** authentication does **not** exist today (React uses a mock role picker; Flutter login is simulated). All endpoints below are the **production** contract to build toward.

### 1.4 Standard error envelope
Every non-2xx returns this shape:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "One or more fields are invalid.",
    "requestId": "req_01J9ZK7Q2M",
    "details": [
      { "field": "requestedStopId", "issue": "Stop does not belong to the requested route." }
    ]
  }
}
```

| HTTP | `error.code` | Meaning |
|---|---|---|
| 400 | `VALIDATION_FAILED` | Malformed body/params; `details[]` lists fields |
| 401 | `UNAUTHENTICATED` | Missing/invalid/expired token |
| 403 | `FORBIDDEN` | Authenticated but not allowed for this resource |
| 404 | `NOT_FOUND` | Resource does not exist **or** caller may not see it (do not leak existence) |
| 409 | `CONFLICT` | State conflict (e.g. duplicate active assignment, stale `If-Match`) |
| 422 | `INVARIANT_VIOLATED` | Business rule failed (e.g. stop not on route) |
| 429 | `RATE_LIMITED` | Too many requests; `Retry-After` header set |
| 500 | `INTERNAL` | Unexpected; `requestId` for support |

- `requestId` is returned on **all** responses (header `X-Request-Id` and in error body) for tracing.
- 404 vs 403: when existence itself is sensitive (another family's student), return **404**.

### 1.5 Pagination, filtering, sorting
- Cursor pagination for lists: `?limit=50&cursor=<opaque>`. Default `limit=25`, max `100`.
- Response:
```json
{ "data": [ /* ... */ ], "page": { "nextCursor": "eyJ...", "hasMore": true } }
```
- Filtering by query params, e.g. `GET /api/v1/trips?routeId=...&serviceDate=2026-10-11&status=IN_PROGRESS`.
- Sorting: `?sort=createdAt:desc` (whitelisted fields per endpoint).

### 1.6 Idempotency & concurrency
- State-changing operational writes (boarding events, payments, trip status) accept **`Idempotency-Key: <uuid>`**; the server dedupes retries within 24h and replays the original result. Required because drivers/clients reconnect on flaky campus networks.
- Updates to admin-managed entities support optimistic concurrency via `If-Match: "<version>"` → `409 CONFLICT` on mismatch (`version` is an integer/etag on each mutable resource).

### 1.7 Prototype vs production labelling
Each group is tagged:
- **[PROD]** — real, authorized, persisted.
- **[PROTOTYPE]** — behaviour that exists only as a simulation today and must **not** be presented as real (payments, AI recommendations, GPS). The API surface is defined so the client can be built, but the server returns clearly-marked simulated data until the real subsystem lands.

---

## 2. Authorization model (applies to every endpoint)

Two layers, both server-side:
1. **Role permission** — from the static map in [`domain-model.md`](./domain-model.md) §1.2 (e.g. `write:boarding-event` requires DRIVER/ADMIN).
2. **Resource ownership/scope** — e.g.:
   - STUDENT: only their own `StudentProfile` and their active `RideAssignment`/`Trip`.
   - PARENT: only students where a `StudentGuardian` row exists with `canTrack=true` for the caller's guardian profile.
   - DRIVER: only the `Trip` where `Trip.driverId == caller.driverProfileId` (and its vehicle/riders).
   - ADMIN: fleet-wide, subject to permission.

Client route guards are UX only. **Never** trust a client-supplied `studentId`/`tripId` without re-checking the caller's relationship to it.

---

## 3. Authentication & current user

### `POST /api/v1/auth/login` **[PROD to build; simulated today]**
- Public. Body: `{ "identifier": "user@campus.edu", "password": "•••" }` (identifier = email or phone).
- 200: `{ "accessToken": "...", "refreshToken": "...", "expiresIn": 900, "user": { "id", "email", "primaryRole", "displayName", "avatarUrl" } }`
- 401 `UNAUTHENTICATED` (bad credentials — do not reveal which field), 429 on repeated attempts (rate-limited, §10).
- **No plaintext password storage**; argon2id hash only.

### `POST /api/v1/auth/refresh`
- Body: `{ "refreshToken": "..." }` → 200 new token pair (rotation; old token invalidated). 401 if expired/reused.

### `POST /api/v1/auth/logout`
- Authenticated. Revokes the current refresh token. 204.

### `GET /api/v1/me`
- Authenticated (any role). Returns the caller's principal + role profile summary + active context.
```json
{
  "user": { "id": "01J...", "email": "s@campus.edu", "primaryRole": "STUDENT", "displayName": "Sarah Ahmed" },
  "student": { "id": "01J...", "studentNumber": "22F-3891", "enrollmentStatus": "ACTIVE" },
  "activeAssignment": { "id": "01J...", "routeId": "01J...", "pickupStopId": "01J...", "dropStopId": "01J..." }
}
```
- For PARENT: `{ "user": {...}, "guardian": {...}, "linkedStudents": [ {studentId, fullName, canTrack} ] }`.
- For DRIVER: `{ "user": {...}, "driver": {...}, "currentTripId": "01J..." | null }`.

### `PATCH /api/v1/me`
- Update own display name / avatar / phone. 200 with updated `user`.

---

## 4. Student transport information (self-service)

### `GET /api/v1/me/ride`
- STUDENT (own) / PARENT (linked, via `?studentId=`) / ADMIN.
- Returns the rider's **current ride context**: active assignment, today's inbound & return trips, pickup/drop stop, and the live tracking view for the assigned trip.
```json
{
  "assignment": { "id", "routeId", "route": {"code":"R2","name":"...","colorHex":"#3b82f6"},
                   "pickupStop": {"id","name","sequence","scheduledInboundTime"},
                   "dropStop": {"id","name","sequence"} },
  "trips": {
    "inbound": { "tripId", "serviceDate", "direction": "INBOUND", "status": "IN_PROGRESS",
                 "scheduledDepartureAt": "...", "scheduledArrivalAt": "...", "delayMinutes": 1,
                 "vehicle": {"id","plateNumber","vehicleType","seatCapacity"},
                 "driver": {"id","fullName","ratingAvg"},
                 "tracking": { /* VehicleTrackingView, domain-model §5.3 */ } },
    "return":  { "tripId", "direction": "RETURN", "status": "SCHEDULED", "...": "..." }
  },
  "journeyStatus": "WAITING"
}
```
- `journeyStatus` = latest `BoardingEvent` for the current trip (derived). PARENT must pass `?studentId=` and be authorized; else 404.

### `GET /api/v1/me/ride/history`
- STUDENT/PARENT(linked). Cursor-paginated past trips with boarding/alighting times and outcome. Read model derived from `BoardingEvent` + `Trip`. Replaces `TransportHistoryItem` (which stored names, not ids).
- `?limit=&cursor=&from=&to=`. Each item: `{ "tripId","serviceDate","direction","routeCode","plateNumber","pickupStopName","boardedAt","alightedAt","outcome":"COMPLETED","delayMinutes" }`.

### `GET /api/v1/me/notifications` · `POST /api/v1/me/notifications/{id}/read` · `POST /api/v1/me/notifications/read-all`
- Any authenticated role. Scoped to the caller (audience match or structured ref they can see). Read state is **per-user** (`NotificationRead`), fixing the global `read` boolean.
- List item: `{ "id","type","severity","title","body","createdAt","read","refs":{"tripId","routeId","studentId"} }`.

---

## 5. Parent & linked children

### `GET /api/v1/me/children`
- PARENT. Returns students linked via `StudentGuardian` for the caller.
```json
{ "data": [ { "studentId":"01J...", "fullName":"Sarah Ahmed", "relationship":"Mother",
              "isPrimary":true, "canTrack":true, "routeCode":"R2", "journeyStatus":"ON_BOARD" } ] }
```

### `GET /api/v1/me/children/{studentId}/ride`
- PARENT (authorized via `StudentGuardian.canTrack`) / ADMIN. Same shape as §4 `/me/ride` but for the specified child. 404 if not linked.
- This is the **only** tracking data a guardian receives — scoped to their linked children's trips/vehicles. Never fleet-wide.

### `GET /api/v1/me/children/{studentId}/fees` · `/history` · `/notifications`
- Mirror §4/§6 for a linked child; same authorization gate.

---

## 6. Fees & payments

### `GET /api/v1/me/fees`  (or `/me/children/{studentId}/fees`)
- STUDENT / PARENT(linked) / ADMIN. Returns the current term invoice with installments and derived balance.
```json
{
  "invoice": { "id":"01J...", "termCode":"FA26", "totalAmountPkr":55000, "currency":"PKR",
               "status":"PARTIAL", "paidAmountPkr":27000, "balancePkr":28000, "issuedAt":"..." },
  "installments": [
    { "id":"01J...", "number":1, "label":"Deposit to secure seat", "amountPkr":30000, "dueDate":"2026-08-15", "status":"PAID" },
    { "id":"01J...", "number":2, "label":"Before Mid-I", "amountPkr":15000, "dueDate":"2026-10-10", "status":"PENDING" }
  ]
}
```
- `paidAmountPkr`/`balancePkr`/`status` are **derived** from confirmed payments, not stored (fixes `feePaid`/`feeStatus`/`feeAmount` drift).

### `POST /api/v1/me/fees/payments` **[PROTOTYPE — manual confirm only]**
- STUDENT / PARENT(linked). Records a payment intent. Body: `{ "invoiceId":"01J...", "installmentId":"01J..."?, "amountPkr":15000, "method":"CASH" }`, `Idempotency-Key` required.
- 201 `{ "paymentId":"01J...", "status":"PENDING" }`.
- **No gateway is integrated.** A real charge is **not** taken. In production phase this becomes admin-confirmed or gateway-backed; until then it creates a `PENDING` payment an admin confirms. Must never be presented to the user as a completed transaction. See ADR‑009.
- 422 if amount exceeds balance; 403 if not the owner/linked guardian.

### `GET /api/v1/admin/fees/invoices` · `POST /api/v1/admin/payments/{paymentId}/confirm`
- ADMIN. List/search invoices (`?status=PARTIAL&termCode=FA26&cursor=`); confirm a pending payment (writes `Payment.status=CONFIRMED`, recomputes invoice status, emits `AuditEvent` + a `STATUS_CHANGE` notification).

---

## 7. Driver — assigned trip & operational actions

### `GET /api/v1/me/trip`  (alias `GET /api/v1/driver/current-trip`)
- DRIVER. Returns the caller's assigned trip for the current window (vehicle, route with ordered stops, rider manifest, live tracking view). 404/`{ "trip": null }` if no active assignment.
```json
{
  "trip": { "tripId":"01J...", "routeId":"01J...", "direction":"INBOUND", "serviceDate":"2026-10-11",
            "status":"IN_PROGRESS", "scheduledDepartureAt":"...", "currentStopSequence":7, "delayMinutes":0 },
  "vehicle": { "id":"01J...", "plateNumber":"Coaster # 7101", "seatCapacity":30 },
  "route": { "code":"R2", "name":"...", "stops":[ {"id","sequence","name","latitude","longitude","scheduledInboundTime"} ] },
  "manifest": [ { "studentId":"01J...", "fullName":"Hamza Tariq", "pickupStopId":"01J...",
                  "dropStopId":"01J...", "journeyStatus":"WAITING" } ],
  "occupancy": { "registeredCount":27, "onboardCount":12, "capacity":30, "percent":40 }
}
```
- The manifest exposes only riders on **this driver's** trip.

### `POST /api/v1/me/trip/status`
- DRIVER (own trip) / ADMIN. Advance trip lifecycle. Body: `{ "status":"BOARDING" | "IN_PROGRESS" | "COMPLETED", "occurredAt":"..."? }`, `Idempotency-Key`.
- 200 returns updated `trip`. 409 on an illegal transition (e.g. `COMPLETED → IN_PROGRESS`). Emits a `trip.status` WS event + `AuditEvent`.

### `POST /api/v1/me/trip/advance-stop`
- DRIVER (own trip). Body: `{ "stopSequence": 8 }`. Validates the stop is the next in order (or a documented skip). 200 with updated `currentStopSequence`. Emits `trip.progress`.

### `POST /api/v1/me/trip/boarding`  (see §8 for the shared boarding endpoint)
- Convenience alias for the driver's own trip; identical semantics/validation to §8.

### `POST /api/v1/me/trip/incidents`
- DRIVER (own trip). Body: `{ "type":"TRAFFIC", "severity":"MEDIUM", "message":"...", "latitude":?, "longitude":? }`. 201 `Incident`. Emits `incident.created` + notifies ADMIN. Replaces the ad-hoc `handleDriverIncident`.

---

## 8. Boarding & journey-status updates (shared operational write)

### `POST /api/v1/trips/{tripId}/boarding-events`
- DRIVER (assigned to `tripId`) / ADMIN. Records a boarding/alighting/absence.
- Body: `{ "studentId":"01J..." | "staffProfileId":"01J...", "riderType":"STUDENT", "stopId":"01J...", "event":"BOARDED", "source":"DRIVER", "occurredAt":"..." }`, `Idempotency-Key` **required**.
- 201 `{ "id":"01J...", "tripId", "studentId", "event":"BOARDED", "occurredAt", "journeyStatusNow":"ON_BOARD" }`.
- Validation: rider must be on the trip manifest; `stopId` must be on the trip's route; event transition allowed (§9). 422 on violation. 403 if the driver is not assigned to `tripId`.
- Emits `boarding.updated` (scoped) + a `STATUS_CHANGE` notification to the rider's guardians. Replaces `handleUpdateStudentStatus` / `handlePassengerStatusFromDriver`.
- **Batch:** `POST /api/v1/trips/{tripId}/boarding-events:batch` with `{ "events":[...] }` for a whole-stop scan (driver marks all at a stop). Same idempotency rules.

---

## 9. Allowed journey-status transitions

`BoardingEvent.event` per rider per trip:

```
(none) → WAITING → BOARDED → ALIGHTED
              ↘ ABSENT / NO_SHOW (terminal for the trip)
```
- `WAITING` may be set by SYSTEM at trip `BOARDING`.
- `BOARDED` requires a prior `WAITING` (or direct by DRIVER with reason).
- `ALIGHTED` requires `BOARDED`.
- `ABSENT`/`NO_SHOW` are terminal for that trip.
- Out-of-order writes return 409 with the current state. (Existing app allowed arbitrary mutation of one `journeyStatus` field with no history.)

---

## 10. Incidents & alerts (admin)

### `GET /api/v1/admin/incidents`  `?status=OPEN&severity=HIGH&tripId=&cursor=`
- ADMIN. Paginated. Item = full `Incident`.

### `POST /api/v1/admin/incidents/{id}/acknowledge` · `/resolve`
- ADMIN. Transitions `OPEN→ACKNOWLEDGED→RESOLVED`. 200 updated incident + `AuditEvent`. Emits `incident.updated`.

### `POST /api/v1/admin/notifications`
- ADMIN. Broadcast/targeted alert. Body: `{ "type":"DELAY", "severity":"MEDIUM", "title":"...", "body":"...", "audienceRole":"PARENT"?, "refs":{"tripId","routeId","studentId"}? }`. 201. Emits `notification.created` to the matched audience.
- Rate-limited (bulk-notification guard, §14).

---

## 11. Admin — fleet, routes, stops, people, trips, assignments

All ADMIN unless noted. All mutations write `AuditEvent`. Lists are cursor-paginated and filterable.

### Fleet
- `GET /api/v1/admin/vehicles` `?status=IN_SERVICE&cursor=` → `Vehicle[]`.
- `POST /api/v1/admin/vehicles` · `GET/PATCH /api/v1/admin/vehicles/{id}` · `DELETE .../{id}` (soft).
- `POST /api/v1/admin/vehicles/{id}/status` `{ "status":"MAINTENANCE", "reason":"..." }`.

### Routes & stops
- `GET /api/v1/admin/routes` `?isActive=true` → summary list.
- `POST /api/v1/admin/routes` · `GET/PATCH/DELETE /api/v1/admin/routes/{id}`.
- `GET /api/v1/admin/routes/{id}/stops` → ordered `RouteStop[]`.
- `POST /api/v1/admin/routes/{id}/stops` · `PATCH /api/v1/admin/stops/{stopId}` · `DELETE /api/v1/admin/stops/{stopId}`.
- `POST /api/v1/admin/routes/{id}/stops:reorder` `{ "orderedStopIds":[...] }` — atomic re-sequence (transaction; validates contiguity).

### People
- `GET /api/v1/admin/students` `?routeId=&enrollmentStatus=&q=&cursor=` → `StudentProfile[]` (+ active assignment summary).
- `POST /api/v1/admin/students` · `GET/PATCH /api/v1/admin/students/{id}`.
- `GET /api/v1/admin/drivers` · `POST` · `GET/PATCH /{id}`.
- `GET /api/v1/admin/guardians` · `POST /api/v1/admin/students/{id}/guardians` (link) · `DELETE /api/v1/admin/student-guardians/{linkId}`.

### Trips & assignment (crew/vehicle)
- `GET /api/v1/admin/trips` `?serviceDate=&routeId=&status=&direction=&cursor=`.
- `POST /api/v1/admin/trips` `{ "routeId", "serviceDate", "direction", "vehicleId"?, "driverId"?, "scheduledDepartureAt", "scheduledArrivalAt" }` — 409 on `UNIQUE(routeId, serviceDate, direction)` violation.
- `PATCH /api/v1/admin/trips/{id}/assignment` `{ "vehicleId"?, "driverId"? }` — crew/vehicle swap (validated against §9 invariants) + `AuditEvent`. Replaces the AI "breakdown_replace" mutation.
- `POST /api/v1/admin/trips/{id}/cancel` `{ "reason":"..." }` → `CANCELLED`, notifies affected riders/guardians.

### Ride assignments
- `GET /api/v1/admin/assignments` `?routeId=&studentId=&status=ACTIVE&cursor=`.
- `POST /api/v1/admin/assignments` `{ "studentId", "routeId", "pickupStopId", "dropStopId", "termId"? }` — 422 if stop∉route (invariant §9.1) or 409 if an active assignment exists.
- `PATCH /api/v1/admin/assignments/{id}` · `POST /api/v1/admin/assignments/{id}/end`.
- `POST /api/v1/admin/assignments:batch` `{ "operations":[...] }` — bulk reassignment (the AI "redistribution" action), atomic, one `AuditEvent` per change.

---

## 12. Route-change requests

### `POST /api/v1/me/route-change-requests`
- STUDENT / PARENT(linked). Body: `{ "requestedRouteId":"01J...", "requestedStopId":"01J...", "reason":"Address change" }`. Current assignment/stop are read server-side (never client-supplied names). 201 `{ "id", "status":"PENDING" }`.
- 422 if the requested stop is not on the requested route, or the student already has a pending request.

### `GET /api/v1/me/route-change-requests`
- STUDENT/PARENT(linked): own requests. 

### `GET /api/v1/admin/route-change-requests`  `?status=PENDING&cursor=`
- ADMIN. Paginated.

### `POST /api/v1/admin/route-change-requests/{id}/decide`
- ADMIN. Body: `{ "decision":"APPROVE" | "REJECT", "note":"..."? }`, `If-Match` for concurrency.
- On APPROVE: transactionally end the current `RideAssignment`, create the new one, set `status=APPROVED`, write `AuditEvent`, notify the student/guardian. 200 with the new assignment.
- On REJECT: `status=REJECTED` + notify. 409 if already decided.
- Fixes the existing bug where approval matched on the wrong key and reassigned nobody (audit).

### `POST /api/v1/admin/route-change-requests:batch-decide`
- ADMIN. `{ "ids":[...], "decision":"APPROVE" }` — atomic batch (existing `handleBatchProcess`).

---

## 13. Reports & operational summaries

### `GET /api/v1/admin/reports/ridership`  `?from=&to=&routeId=&groupBy=route|day`
- ADMIN. Aggregated ridership/utilization. `{ "series":[ { "key":"R2", "boardedCount":..., "tripCount":..., "avgUtilizationPercent":... } ] }`.

### `GET /api/v1/admin/reports/on-time-performance`  `?from=&to=&routeId=`
- `{ "series":[ { "routeCode":"R3", "avgDelayMinutes":6.2, "onTimePercent":71 } ] }`.

### `GET /api/v1/admin/reports/fee-collection`  `?termCode=FA26`
- `{ "totalBilledPkr":..., "collectedPkr":..., "outstandingPkr":..., "byStatus":{...} }`.

### `GET /api/v1/admin/summary` (command-center snapshot)
- One call for the admin dashboard header/HUD: `{ "activeTripCount", "vehicleCount", "registeredRiderCount", "fleetUtilizationPercent", "pendingRequestCount", "openIncidentCount", "fleetFreshness" }`. Replaces the client-side reductions in `App.tsx`.

- Reports are read-only aggregations; no export formats defined yet (CSV/PDF are future work, out of scope).

---

## 14. Rate limiting & protection (sensitive operations)

| Operation class | Limit (default) | Notes |
|---|---|---|
| `auth/login`, `auth/refresh` | 5 / min / IP + account | Exponential backoff, lockout after N failures |
| Boarding writes | 120 / min / driver | Idempotency-key dedupe |
| Payment creation | 5 / min / user | Anti-double-charge |
| Broadcast notifications | 10 / min / admin | Prevent notification storms |
| General authenticated reads | 300 / min / user | 429 + `Retry-After` |

- All admin mutations and authorization failures are audit-logged. See [`realtime-contract.md`](./realtime-contract.md) for live-data authorization and [`domain-model.md`](./domain-model.md) §"Security/ops" cross-refs.

---

## 15. Endpoint summary (index)

| Group | Representative endpoints | Role |
|---|---|---|
| Auth/profile | `/auth/login`, `/auth/refresh`, `/me` | public / any |
| Student ride | `/me/ride`, `/me/ride/history`, `/me/notifications` | STUDENT, PARENT(linked), ADMIN |
| Parent/children | `/me/children`, `/me/children/{id}/ride` | PARENT, ADMIN |
| Driver ops | `/me/trip`, `/me/trip/status`, `/me/trip/advance-stop`, `/me/trip/incidents` | DRIVER, ADMIN |
| Boarding | `/trips/{tripId}/boarding-events` (+`:batch`) | DRIVER(assigned), ADMIN |
| Fees | `/me/fees`, `/me/fees/payments`, `/admin/fees/invoices`, `/admin/payments/{id}/confirm` | STUDENT/PARENT/ADMIN |
| Incidents/alerts | `/admin/incidents*`, `/admin/notifications` | ADMIN |
| Fleet/routes/people/trips | `/admin/vehicles*`, `/admin/routes*`, `/admin/stops*`, `/admin/students*`, `/admin/drivers*`, `/admin/trips*`, `/admin/assignments*` | ADMIN |
| Route-change | `/me/route-change-requests`, `/admin/route-change-requests*` | STUDENT/PARENT/ADMIN |
| Reports | `/admin/reports/*`, `/admin/summary` | ADMIN |

> **Design note:** endpoints model **domain operations and authorization boundaries**, not screens. Several React screens (AI recommendation drawer, what-if simulator, breakdown drill) are **admin decision-support** and are intentionally **not** given CRUD endpoints here; when an admin accepts such a suggestion it resolves to a real domain write (`assignments:batch`, `trips/{id}/assignment`, `trips/{id}/cancel`) that is audited. See ADR‑009 / §7.6 of the domain model.
