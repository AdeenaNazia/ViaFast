# ViaFast — Architecture Decisions (ADRs)

Status: **Accepted decisions** for the shared domain + API/WS contract freeze, incorporating the **Phase 2 sign-off** (ADR‑017 … ADR‑025). Each ADR is concise: context → decision → alternatives → consequences. The former open items Q1–Q9 are now **resolved** in §B; a small number of **operational caveats remain open** — fee opening balances (pending university finance), the *proposed* 90‑day raw‑GPS retention window (pending university approval, **not** confirmed policy), and demand‑planning figures (unverified until validated). Those are tagged **[UNRESOLVED‑OPS]**.
Companion docs: [`domain-model.md`](./domain-model.md), [`api-contract.md`](./api-contract.md), [`realtime-contract.md`](./realtime-contract.md), [`data-integrity-audit.md`](./data-integrity-audit.md).

Deployment assumptions throughout: **one campus, 1–10 buses**, Android + iOS mobile (Student/Parent/Driver) in a single Flutter codebase, the existing React app retained as the Admin Dashboard initially, and a future Node + TypeScript + Prisma + PostgreSQL backend with REST + WebSocket. Explicitly **no** Redis / microservices / Kubernetes absent a concrete requirement.

---

## A. Accepted decisions

### ADR‑001 — Keep GPS behind a provider abstraction; select no vendor now
- **Context.** Physical GPS hardware is undecided. The existing uncommitted `src/tracking/` already defines a `TrackingProvider` port + `SimulatedTrackingProvider`.
- **Decision.** The backend exposes one `TrackingProvider` port (domain-model §5.1; realtime §8). `SimulatedTrackingProvider` now; a `HardwareTrackingProvider` later. Clients see only the normalized `VehicleTrackingView` + `vehicle.position` frame. No vendor SDK, no mapping package, no location dependency added in this phase.
- **Alternatives.** (a) Bind to a specific device/telematics SDK now — rejected: hardware not chosen, would force a rewrite. (b) Let clients consume raw device payloads — rejected: leaks vendor shape into two client codebases.
- **Consequences.** Choosing hardware later means writing one adapter, not touching schema or clients. Slight overhead: the normalized schema must be rich enough for unknown devices (hence optional `headingDeg`/`accuracyM`/`altitudeM`).

### ADR‑002 — Surrogate ULID keys; business identifiers are attributes, never foreign keys
- **Context.** Audit issues 1, 2, 15, 18: legacy code keys on registration numbers, phone numbers, and stop **names**, producing broken joins and silent no-ops.
- **Decision.** Every entity's PK is an opaque **ULID**. `studentNumber`, `phoneE164`, `plateNumber`, `licenseNumber`, `route.code` are UNIQUE **attributes** used for display/search only. All relationships are FK-by-id.
- **Alternatives.** (a) Natural keys (registration number, phone) — rejected: they change, collide, and aren't unique across roles. (b) Random UUIDv4 — workable, but ULID sorts by time (nicer indexes/pagination).
- **Consequences.** Requires an id-mapping step at import. Eliminates the entire class of "matched on the wrong key" bugs.

### ADR‑003 — Static permission map + service-layer resource checks (not DB-driven RBAC)
- **Context.** 1–10 buses, five roles. A permissions table/engine is overkill.
- **Decision.** Coarse permissions are a **static code map** (domain-model §1.2). Resource-level checks (this guardian↔this student, this driver↔this trip) run in the service layer on every request.
- **Alternatives.** (a) Full RBAC/ABAC engine with DB policies — rejected as premature complexity. (b) Role check only — rejected: fails parent/driver scoping.
- **Consequences.** Adding a role means a code change + deploy (acceptable at this scale). Authorization logic is centralized and testable.

### ADR‑004 — Record crew/vehicle swaps as `AuditEvent`s, not a dedicated history table
- **Context.** Small fleet; swaps are infrequent but must be traceable.
- **Decision.** A swap updates `Trip.vehicleId`/`Trip.driverId` and writes an `AuditEvent` (before/after). No `TripAssignmentSwap` table (domain-model §4.3 defers it).
- **Alternatives.** Bitemporal assignment history table — rejected: unneeded for this scale; audit log covers traceability.
- **Consequences.** Reconstructing "who drove trip X at time T" requires reading audit rows; fine for 1–10 buses. Revisit only if compliance demands point-in-time crew history.

### ADR‑005 — ISO‑8601 UTC timestamps everywhere on the wire; `timestamptz` at rest
- **Context.** Audit issue 10: legacy uses display and **relative** strings (`"10 mins ago"`, `"Today"`), plus epoch ms in tracking — three time models.
- **Decision.** All API/WS timestamps are ISO‑8601 UTC. Postgres stores `timestamptz`. Formatting to local/12h is a **client** concern.
- **Alternatives.** Epoch ms everywhere — viable but less readable in logs/JSON; local-time strings — rejected (ambiguous).
- **Consequences.** Legacy relative strings are unrecoverable and must be regenerated or dropped at import (audit §migration).

### ADR‑006 — Integer PKR money; balances and statuses derived, never stored
- **Context.** Audit issues 4, 20, 21: `feePaid`/`totalFee`/`feeAmount`/`feeStatus` overlap and drift; binary status can't show partial.
- **Decision.** Money is an integer `amountPkr`. `FeeInvoice.status`, `paidAmountPkr`, `balancePkr` are **derived** from confirmed `Payment`s + due dates. Invariant `SUM(installments) == invoice.total` (domain-model §6, §9.4).
- **Alternatives.** Store balance/status columns — rejected: they drift (exactly the legacy bug). Decimal/float money — rejected: rounding.
- **Consequences.** Reads compute balance from the ledger (cheap at this scale; can cache if needed).
- **[Phase‑3 implementation note]** The database foundation stores money as exact PostgreSQL `numeric` — `DECIMAL(14,2)` via Prisma `Decimal` — rather than a float. This **refines** the original "integer PKR" wording to satisfy the Phase‑3 requirement to "use decimal types for financial amounts," while preserving this ADR's actual intent: **no float rounding** and **derived** balances/statuses. `numeric` is exact (it does not reintroduce the rounding this ADR rejected) and additionally allows paisa precision. Balances/statuses remain computed from the `Payment` ledger and are never stored as authoritative.

### ADR‑007 — Position, occupancy, and ETA are live/derived, not stored truth
- **Context.** Brief explicitly asks which of these are live vs snapshot vs calculated. Audit issues 9, 13: position duplicated and divergent; "occupancy" was really bookings; three load numbers disagreed.
- **Decision.**
  - **Position:** append-only `LocationUpdate` history; "current" = latest fix (short-lived cache/projection).
  - **Occupancy:** computed — `registeredCount` (active assignments) vs `onboardCount` (boarding events), two distinct metrics.
  - **ETA:** computed by the ETA service on demand/on fix; optionally cached as `EtaEstimate` latest-per-trip; never authoritative.
- **Alternatives.** Store `currentLat/Lng`/`occupancy` on `Vehicle`/`Trip` — rejected: recreates the divergence bug.
- **Consequences.** Slightly more compute per read; correctness and a single source of truth in exchange.

### ADR‑008 — Authorization is always enforced server-side per resource
- **Context.** Brief: "Never rely on client-side route guards alone." The Flutter dev role-preview is explicitly not auth.
- **Decision.** Every request/subscription re-checks role permission **and** resource scope (api §2; realtime §5). Existence of sensitive resources is hidden with 404 (api §1.4). Client guards are UX only.
- **Alternatives.** Trust the `primaryRole` claim / client filters — rejected.
- **Consequences.** Scope must be recomputed when links/assignments change; the WS layer emits `scope.changed` (realtime §6.7).

### ADR‑009 — Hard boundary between prototype and production subsystems
- **Context.** Brief: don't imply payments/auth/GPS exist today. Audit issue 19: it's a frontend prototype.
- **Decision.** Every endpoint/event is tagged **[PROD]** or **[PROTOTYPE]** (api §1.7). Payments are manual/admin-confirmed with **no gateway**; AI recommendations are decision-support that resolve into real audited domain writes (assignments:batch / trip assignment / cancel), **not** their own CRUD; GPS is simulated behind ADR‑001.
- **Alternatives.** Mock a fake repository/gateway to "look real" — rejected (brief forbids a fake backend layer).
- **Consequences.** Clients must render prototype state honestly (Flutter already shows "Dev build — no backend").

### ADR‑010 — Time-box raw location history, then downsample
- **Context.** Even 10 buses at ≤1 Hz produce meaningful volume; indefinite raw retention is unnecessary.
- **Decision.** Keep fine-grained `LocationUpdate` for a default **30-day** rolling window, then downsample to per-trip summaries. Retention window is configurable (domain-model §5.1).
- **Alternatives.** Retain all raw fixes forever — rejected (cost, little value). No history — rejected (needed for trip replay/on-time reports).
- **Consequences.** Historical replay beyond the window uses summaries, not raw fixes. **[Superseded in part by ADR‑021]** the *proposed* configurable default is now **90 days** (was a 30‑day placeholder), still **[UNRESOLVED‑OPS]** pending university approval and a compliance ruling on per‑trip raw export (Q5).

### ADR‑011 — Assumptions register (now resolved by the Phase 2 sign-off)
- **Context.** `domain-model.md` flags several modelling choices as "assumption — flagged in ADR‑011" (Term scope, `REJECTED` vs `WITHDRAWN`, deferral of `RouteSchedule`/`StaffRideBooking`/`TripAssignmentSwap`). These were collected as open questions Q1–Q9 in §B during the contract-freeze draft.
- **Decision.** ADR‑011 is the **umbrella register** for those assumptions. As of the Phase 2 sign-off each is resolved by a dedicated ADR: Term → **ADR‑017**; fee balances → **ADR‑018**; timezone → **ADR‑019**; demand → **ADR‑020**; GPS retention → **ADR‑021**; staff riders → **ADR‑022**; route-change request statuses → **ADR‑023**; authentication method → **ADR‑024**; notifications/push → **ADR‑025**. Deferred entities (`RouteSchedule`, `TripAssignmentSwap`) remain deferred; `StaffRideBooking` is adopted (ADR‑022).
- **Alternatives.** Leave the assumptions inline in `domain-model.md` only — rejected: they need an auditable accept/reject trail.
- **Consequences.** Where `domain-model.md` says "flagged in ADR‑011", read the specific ADR above. No assumption remains silently open; only the **[UNRESOLVED‑OPS]** caveats in §B do.

### ADR‑012 — Environment/flavor config boundary; no hardcoded URLs or secrets
- **Context.** Brief §9: clear dev/prod boundary, no secrets in source, don't connect to a nonexistent backend.
- **Decision.** Host/base URL come from environment only (Flutter `EnvConfig.apiBaseUrl`, currently `null`; server env vars). Dev-only surfaces are env-gated (the Flutter `guardRedirect` already blocks `/preview` etc. in `prod`). No credential, key, or token in source or docs.
- **Alternatives.** Commit config with placeholders — rejected: secrets creep.
- **Consequences.** A real base URL is set only when a backend exists; until then the client stays offline-safe.

### ADR‑013 — Short-lived access token + rotating refresh; ticket-based WS auth
- **Context.** Mobile sessions are long-lived; tokens expire; browsers can't set WS headers reliably.
- **Decision.** Access token (JWT, ~15 min) + rotating refresh (httpOnly/secure). WS connects via a **single-use 30s ticket** from `POST /realtime/ticket` (realtime §2.1). Mid-session refresh = new ticket + `resume` reconnect.
- **Alternatives.** Long-lived token in the WS query string — rejected (leaks in logs, hard to revoke). Cookie-only WS — rejected (mobile + CSRF surface).
- **Consequences.** Slightly more handshake steps; robust revocation and no token-in-URL leakage.

### ADR‑014 — No new client packages this phase
- **Context.** Brief: don't add mapping/push/networking/GPS packages without a concrete requirement; don't change `pubspec.yaml`.
- **Decision.** The Flutter app keeps only `flutter_riverpod` + `go_router` (from the completed foundation). This phase adds **no** packages and changes **no** Flutter behavior — it is documentation only.
- **Alternatives.** Pre-add `dio`/`web_socket_channel`/maps now — rejected: premature; the contract must be frozen first.
- **Consequences.** When the backend exists, networking packages are added against a stable contract (next phase), not before.

### ADR‑015 — One Flutter codebase for all three rider roles; React admin retained
- **Context.** Brief: single Flutter app for Student/Parent/Driver; React stays as Admin initially.
- **Decision.** Role is a runtime concern (a `User.primaryRole` driving navigation), not separate apps. The shared `VehicleTrackingView`/API contract is consumed by both Flutter and the React admin.
- **Alternatives.** Separate app per role — rejected (3× maintenance). Rewrite admin in Flutter now — rejected (brief defers it).
- **Consequences.** The contract must satisfy both a mobile client and a desktop-web admin; hence the projection-based read models.

### ADR‑016 — Naming: camelCase JSON, snake_case DB, UPPER_SNAKE enums
- **Context.** Legacy mixes camelCase/Title Case enums and `lat`/`lng` abbreviations.
- **Decision.** Wire = camelCase; DB columns = snake_case (Prisma-mapped); enums = UPPER_SNAKE; coordinates spelled `latitude`/`longitude` (domain-model §0).
- **Alternatives.** Keep legacy Title Case enums / `lat`/`lng` — rejected: inconsistent across the seam (audit issue 22).
- **Consequences.** One-time mapping layer in clients; the audit provides old→new enum maps.

---

### ADR‑017 — `Term` is a first-class entity (resolves Q1)
- **Context.** The legacy app carries only a free-text `semester` string on `Student`. Assignments, invoices, and trips need term scoping and multi-term history.
- **Decision.** Model a first-class **`Term`** (`id`, `code` UNIQUE, `name`, `startDate`, `endDate`). `RideAssignment.termId` and `FeeInvoice.termId` reference it. Term-scoped history is retained (not collapsed to a label).
- **Alternatives.** A string label on each row — rejected: cannot scope billing history or enforce one-active-assignment-per-term cleanly.
- **Consequences.** One-active-assignment invariant becomes per `(student, term)`. Import must map legacy `semester` strings onto `Term` rows.

### ADR‑018 — Quarantine conflicting legacy fee balances; reconcile with finance before import (resolves Q2)
- **Context.** Audit issue 4: legacy seed says 27,000 paid/student while the shared installment schedule implies 45,000 paid. Two authoritative-looking numbers disagree.
- **Decision.** **Do not import either legacy balance.** The schema fully supports `FeeInvoice`/`Installment`/`Payment`, but opening balances are populated **only** from a university-finance reconciliation. Balances/statuses stay **derived** from confirmed payments (ADR‑006). **[UNRESOLVED‑OPS]** the true opening balances are pending finance; no value is invented here.
- **Alternatives.** Pick one legacy number — rejected: would mis-bill real students. Wipe fee history — rejected: finance owns the source of truth.
- **Consequences.** The dev seed uses **clearly synthetic, isolated** financial examples only (never the legacy figures) and never asserts an authoritative balance.

### ADR‑019 — Campus timezone `Asia/Karachi`; store UTC, convert for display/scheduling (resolves Q3)
- **Context.** Legacy stores display/relative strings and local times; seed coordinates are Multan (~PKT). A single canonical zone is needed to parse schedules.
- **Decision.** Persist all timestamps as **UTC** `timestamptz` (ADR‑005). The campus local zone is **`Asia/Karachi` (UTC+5)**, used **only** for local display and for interpreting schedule wall-clock times (`RouteStop.scheduledInboundTime`/`scheduledReturnTime`, `Trip.serviceDate`). The wire stays ISO‑8601 UTC.
- **Alternatives.** Store local time — rejected (ambiguous across DST/history, breaks ordering). Store epoch only — rejected (less readable for schedules).
- **Consequence.** A single documented zone constant; no PKT has DST, so conversions are stable.

### ADR‑020 — Demand-planning figures are unverified demonstration data (resolves Q4)
- **Context.** Audit issue 13: per-stop `demand` sums to 34 vs 27 "booked" vs 4 real students — three conflicting load numbers.
- **Decision.** `demand` is **not** a stored authoritative field. Occupancy/load is **derived** (ADR‑007): `registeredCount` from active `RideAssignment`s, `onboardCount` from `BoardingEvent`s. Legacy `demand` values are **unverified demonstration data** and are not imported as truth. **[UNRESOLVED‑OPS]** they remain unvalidated until the transport office confirms them.
- **Alternatives.** Store `demand` as an admin-editable planning input — rejected for phase 1: it reintroduces the divergence bug.
- **Consequences.** Any planning metric shown to admins must be labelled derived/estimated until validated.

### ADR‑021 — Configurable raw-GPS retention; 90 days *proposed* (NOT confirmed policy) (resolves Q5; updates ADR‑010)
- **Context.** Even ≤10 buses at ≤1 Hz generate volume. Retention must balance replay/on-time reporting against storage and any records obligation.
- **Decision.** Raw `LocationUpdate` retention is **configurable** (env/config), then downsampled to per-trip summaries (ADR‑010). The **proposed** default raw window is raised from the 30‑day placeholder to **90 days**.
- **Caveat (do not overstate).** The 90‑day figure is a **proposal pending university approval** — it is **not** a confirmed legal or university retention policy. **[UNRESOLVED‑OPS]** exact window + whether per-trip raw export is a compliance requirement.
- **Consequences.** The retention value lives in configuration, not code; changing policy is a config change. No fixed legal claim is baked into schema or docs.

### ADR‑022 — Staff passengers are modelled separately from students (resolves Q6)
- **Context.** Audit issue 18: legacy code injected `StaffPassenger` records into the `students` array, creating fake students and breaking joins.
- **Decision.** **`StaffProfile`** is a distinct rider entity. Term-pass staff ride via `RideAssignment` with `riderType=STAFF`; single-trip staff use a lightweight **`StaffRideBooking`** (`tripId` + `staffProfileId` + `stopId` + `status`). **No fake `StudentProfile` rows** are ever created for staff.
- **Alternatives.** Overload `StudentProfile` with an `isStaff` flag — rejected (the exact legacy bug). Full assignment for every staff ride — rejected as heavy for rare single trips.
- **Consequences.** Rider-polymorphic FKs (`studentId` XOR `staffProfileId`, gated by `riderType`) appear on `RideAssignment` and `BoardingEvent`; enforced in the service layer + DB checks.

### ADR‑023 — `REJECTED` and `WITHDRAWN` are distinct route-change request statuses (resolves Q7 for requests)
- **Context.** A route-change request can be **denied by an admin** or **cancelled by its requester** — semantically different outcomes that must not collapse.
- **Decision.** `RequestStatus` on `RouteChangeRequest` includes **both** `REJECTED` (admin/AI denied) **and** `WITHDRAWN` (requester cancelled), as **distinct terminal states**. Full set: `PENDING | AI_REVIEWED | APPROVED | REJECTED | WITHDRAWN`.
- **Scope note.** This decision governs **route-change requests only**. It does **not** change `EnrollmentStatus`, where rejection remains represented as `WITHDRAWN` + an audit reason (domain-model §2.1) to avoid two near-synonymous enrollment states — those are separate enums on separate entities.
- **Consequences.** Analytics can distinguish "we said no" from "they gave up"; the API must expose a requester-initiated withdraw transition.

### ADR‑024 — Email + password is the initial authentication method (resolves Q8)
- **Context.** Some parents/students may lack email, but a single well-understood method is needed first.
- **Decision.** Initial authentication is **email + password** (`argon2id` hash in `User.passwordHash`; plaintext never stored — ADR‑012). `User.phoneE164` is retained as a UNIQUE alternate identifier and a **documented extension point** for future OTP/phone login, which is **not** implemented now.
- **Phase boundary.** Phase 3 provides **schema support only** (the `passwordHash`/`phoneE164` columns). No login, registration, password-reset, refresh-token, or JWT middleware is implemented in the database-foundation phase.
- **Consequences.** Adding OTP later is additive (nullable `passwordHash`, new endpoint) — no schema break.

### ADR‑025 — In-app notifications first; design for push without implementing it (resolves Q9)
- **Context.** Riders need timely alerts; push adds device-token storage + a provider dependency (ADR‑014 forbids new client packages this phase).
- **Decision.** Ship **in-app notifications** now: `Notification` + per-user read state `NotificationRead` (`UNIQUE(notificationId, userId)`, `readAt`). Push is **designed for but not implemented** — no device-token table, no push provider, no FCM/APNs dependency in this phase.
- **Alternatives.** Add push now — rejected (ADR‑014; premature dependency). Skip read-state — rejected (needed for unread badges per user).
- **Consequences.** A future push phase adds a `DeviceToken` entity and a delivery worker without changing the `Notification` shape.

---

## B. Resolution of the former open questions (Q1–Q9)

The nine questions that were **[UNRESOLVED]** at contract-freeze draft are now **approved** (Phase 2 sign-off). Each maps to a dedicated ADR above. No value was invented to close them; where the answer depends on external input (finance, university policy), the **action** is decided and the **data/policy** stays open under §B.1.

| ID | Question (abridged) | Approved decision | ADR |
|---|---|---|---|
| **Q1 ✅** | First-class `Term` entity, or a string label? | **`Term` is a first-class entity**; assignments/invoices are term-scoped and history is retained. | ADR‑017 |
| **Q2 ✅** | What are the true opening fee balances (27k vs 45k)? | **Quarantine** both legacy figures; **reconcile with university finance** before importing any authoritative balance. Do not import either number. | ADR‑018 |
| **Q3 ✅** | Campus timezone for parsing legacy local times? | **`Asia/Karachi` (UTC+5)**; store UTC, convert for local display/scheduling. | ADR‑019 |
| **Q4 ✅** | Is per-stop `demand` a planning input or stale demo data? | **Unverified demonstration data**; load is **derived** from assignments/boarding events, not imported as truth. | ADR‑020 |
| **Q5 ✅** | Raw-GPS retention window + compliance export? | **Configurable** retention; **90 days proposed** (updates the 30-day placeholder), then downsample to summaries. | ADR‑021 |
| **Q6 ✅** | Model for faculty/staff single-trip rides? | **Staff separate from students**; `StaffProfile` + lightweight `StaffRideBooking`; never fake student rows. | ADR‑022 |
| **Q7 ✅** | Distinct `REJECTED` vs `WITHDRAWN`? | **Yes — distinct route-change request statuses** (`RequestStatus` gains `WITHDRAWN`). `EnrollmentStatus` unchanged. | ADR‑023 |
| **Q8 ✅** | OTP/phone login, or email+password only? | **Email + password** initially; `phoneE164`/OTP is a documented, unimplemented extension point. | ADR‑024 |
| **Q9 ✅** | Push notifications, or in-app only? | **In-app notifications first**; design for push, implement **no** push/device-token storage this phase. | ADR‑025 |

### B.1 Residual operational caveats — still **[UNRESOLVED‑OPS]**

These are **not** design questions; they await external input and must not be represented as settled fact:

- **Fee opening balances (ADR‑018).** The reconciliation with university finance has **not** happened. Until it does, no authoritative balance exists; the seed carries only clearly-synthetic, isolated examples. **Never** treat a seeded amount as a real balance.
- **GPS retention window (ADR‑021).** **90 days is a proposal, not a confirmed legal or university policy.** The exact window and any per-trip raw-export compliance obligation remain open. Retention is configurable so the policy can change without a code/schema change.
- **Demand-planning figures (ADR‑020).** Legacy per-stop demand stays **unverified** until the transport office validates it; it is not imported and not shown as authoritative.

---

## C. Decision → audit traceability

| Canonical decision | Fixes audit issue(s) |
|---|---|
| ADR‑002 (surrogate keys) | 1, 2, 5, 15, 18 |
| ADR‑003/008 (server-side authz) | 5, 17 (identity/scope) |
| ADR‑006 (derived money) | 4, 20, 21 |
| ADR‑007 (derived position/occupancy/ETA) | 9, 13 |
| ADR‑005/016 (time + naming) | 10, 16, 22 |
| Trip-centric status/direction (domain-model §3.2/§4.2) | 12 |
| `BoardingEvent` (domain-model §4.4) | 11 |
| Structured notifications (domain-model §7.2) | 7, 8 |
| `StaffProfile` separation (domain-model §2.3) | 18 |
| Server-assigned ids + persistence (ADR‑009) | 19 |

No decision above requires changing the existing React app in this phase; they define the **target** contract only. See [`data-integrity-audit.md`](./data-integrity-audit.md) §"Migration sequencing" for the order in which these would be applied later.
