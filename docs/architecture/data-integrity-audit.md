# ViaFast — Data Integrity Audit (legacy → canonical)

Status: **Read-only findings.** No React source, type, or seed file was modified to produce this document. Every finding is cited to the current working tree (including its **uncommitted** tracking refactor, which was preserved).
Purpose: list the concrete integrity problems in the existing `src/types.ts` + `src/data/initialData.ts` + `src/App.tsx`, give the **canonical representation** (from [`domain-model.md`](./domain-model.md)), and state the **migration implication** for each.

Sources inspected (verified this session):
- `src/types.ts` (all interfaces/enums)
- `src/data/initialData.ts` (all seed arrays)
- `src/App.tsx` (state, handlers, mock auth, simulation loop)
- `src/tracking/{types,status,eta,geo,useLiveTracking,simulatedTrackingProvider}.ts`
- `src/utils/aiEngines.ts` (`calculateSmartETA`, per-route utilization)
- Role shells `src/apps/{ParentApp,AdminApp,DriverApp}.tsx`

Severity legend: **🔴 Critical** (silent data corruption / broken joins), **🟠 High** (semantic ambiguity that will propagate), **🟡 Medium** (normalization/derivation), **⚪ Low** (cosmetic/consistency).

---

## Summary table

| # | Issue | Severity | Legacy evidence | Canonical fix |
|---|---|:--:|---|---|
| 1 | Route-change `studentId` mixes registration number and internal id → approvals reassign nobody | 🔴 | `initialData.ts:804`, `App.tsx:236,278` | `RouteChangeRequest.studentId` = surrogate FK |
| 2 | Denormalized `currentStopName`/`requestedStopName` drift from the student's real stop | 🔴 | `initialData.ts:808,821`, `App.tsx:240-242` | Store `requestedStopId`; read current from assignment |
| 3 | Vehicle↔route↔driver assignment duplicated across 4 entities (8 fields); swaps desync them | 🔴 | `types.ts:28-29,42-43,55-56,120-122`, `App.tsx:379-389` | Assignment lives only on `Trip` |
| 4 | Fee model: 4 overlapping fields; global installment schedule contradicts per-student `feePaid` | 🔴 | `types.ts:80-83`, `initialData.ts:777-799` vs `318-321` | `FeeInvoice`+`Installment`+`Payment`; balance derived |
| 5 | Parent identity is `parentPhone` string; children linked by phone match | 🔴 | `types.ts:76-77`, `ParentApp.tsx` (`parentPhone` filter) | `GuardianProfile` + `StudentGuardian` (M:N) |
| 6 | Empty-string foreign keys for reserve vehicle/driver | 🟠 | `initialData.ts:72,146` | NULL, never `''` |
| 7 | Dangling/incorrect vehicle reference in a notification (`B-07` vs `Coaster # 7101`) | 🟠 | `initialData.ts:705-706` | Structured `refs.vehicleId` |
| 8 | Notifications embed entities as free text; `targetRole`/`type` are `union \| string`; `read` is global | 🟠 | `types.ts:229,233,234`, `initialData.ts:697` | Closed enums, structured refs, per-user `NotificationRead` |
| 9 | Position stored on both `Vehicle` and `ActiveTrip`; sim updates only trips → divergence | 🟠 | `types.ts:46-47,131-132`, `App.tsx:105-134` | Position only in `LocationUpdate`; latest fix projected |
| 10 | Timestamps are display/relative strings (`"10 mins ago"`, `"Today"`, `"7:15 AM"`) | 🟠 | `initialData.ts:620,725,512,689` | ISO‑8601 UTC `timestamptz` |
| 11 | `journeyStatus` is one mutable field — no per-trip, no history, redundant `Picked Up`/`On Board` | 🟠 | `types.ts:5,78`, `App.tsx:159-162` | Immutable `BoardingEvent` per trip; status derived |
| 12 | `Route.status`/`Route.direction` are static but represent live/per-trip state | 🟠 | `types.ts:26,31`, `initialData.ts:226` vs `539` | Status/direction on `Trip`; `Route` is a template |
| 13 | Stop `demand` (34) vs AI "booked" (27) vs actual seeded students (4) — three load numbers | 🟡 | `initialData.ts` route‑2 stops vs `597` | `registeredCount`/`onboardCount` computed from assignments/events |
| 14 | Return-trip times non-monotonic on the forward-ordered stop list | 🟡 | `initialData.ts:168,180` | One inbound order; return = reverse; validated timings |
| 15 | `TripPassenger`/`StaffPassenger` use stop **names** as references | 🟡 | `types.ts:95-96,111-112` | Stop FKs (`stopId`) |
| 16 | Enum drift: `tripType 'Morning'/'Return'` vs `'morning'/'return'`; history `status` ≠ `JourneyStatus` | 🟡 | `types.ts:3,241,248` | Single `TripDirection`; single journey enum |
| 17 | No `User`/auth entity; `Role` includes `'landing'`; auth is a mock picker | 🟠 | `types.ts:1`, `App.tsx:494-513` | `User` + role profiles; `landing` removed |
| 18 | Staff injected into `students[]` with duplicated `studentId 'FACULTY-01'` + fabricated stop id | 🟠 | `App.tsx:305-324` | Separate `StaffProfile` / `StaffRideBooking` |
| 19 | Client-generated ids `…-${Date.now()}` (collision-prone); no persistence (refresh resets) | 🟡 | `App.tsx:196,235,306,405`, `App.tsx:46-53,568` | Server-assigned ULIDs; DB persistence |
| 20 | `feeStatus` binary `Paid/Pending` can't express partial payment | 🟡 | `types.ts:82`, `initialData.ts:320` | `InvoiceStatus` incl. `PARTIAL`/`OVERDUE` |
| 21 | Payment notification hardcodes "Rs. 28,000" regardless of actual balance | 🟡 | `App.tsx:224` | Message composed from the real payment amount |
| 22 | ETA field renamed across the seam (`confidencePercent` → `etaConfidence`) | ⚪ | `aiEngines.ts:21` vs `tracking/types.ts:67` | Canonical `confidencePercent` (alias documented) |

---

## Detailed findings

### 🔴 1. Route-change requests key on two different id spaces
**Problem.** `RouteChangeRequest.studentId` holds the **registration number** in seed data — `req-1.studentId = '22F-3891'` (`initialData.ts:804`), which equals `Student.studentId` (`initialData.ts:306`), not `Student.id` (`'stu-1'`, `initialData.ts:305`). But the runtime path writes the **internal id**: `handleRequestRouteChange` sets `studentId: currentStudent.id` (`App.tsx:236`). The approval path then matches on the internal id: `s.id === req.studentId` (`App.tsx:278`).
**Consequence (verified by reading the code paths):** approving seeded `req-1`/`req-2` compares `'stu-x' === '22F-3891'` → never true → **no student is reassigned**, yet the request is marked `Approved`. A silent correctness bug.
**Canonical.** `RouteChangeRequest.studentId` is always the **surrogate FK** to `StudentProfile.id` (domain-model §7.3). Registration number is a display-only UNIQUE attribute, never a key (ADR‑002).
**Migration implication.** Backfill: map legacy `studentId` values that look like registration numbers (`\d{2}[A-Z]-\d+`) to `StudentProfile.id` via `studentNumber`; map values already internal directly. Add a FK constraint so mixed keys are impossible going forward.

### 🔴 2. Denormalized stop names contradict the source records
**Problem.** `req-1.currentStopName = 'BCG Chowk'` (`initialData.ts:808`), but the referenced student `22F-3891` (Sarah Ahmed, `stu-1`) has `pickupStopId = 'r2-s6'` = **"Dera Adda Chowk"** (`initialData.ts:312`, name at `201`). `req-2.currentStopName = 'Bilal Chowk'` (`initialData.ts:821`) but student `24F-5531` (Bilal Khan, `stu-4`) is at `'r2-s1'` = **"Dreem Garden"** (`initialData.ts:374`, name at `196`). The runtime default makes it worse: `currentStopName: currentRoute.stops[0].name` (`App.tsx:240`) — the *first* stop, not the student's pickup stop.
**Canonical.** Store `requestedStopId` (FK → `RouteStop`); the *current* stop is read from the student's active `RideAssignment.pickupStopId`, never stored on the request (domain-model §7.3).
**Migration implication.** Drop the four name columns (`studentName`, `studentRollNumber`, `currentStopName`, `requestedStopName`). Resolve legacy `requestedStopName` → `requestedStopId` by name lookup within the requested route; log any that don't resolve for manual review.

### 🔴 3. Vehicle ↔ route ↔ driver assignment is stored 4× and desyncs on swap
**Problem.** The same triple is duplicated across:
- `TransportRoute.busId` + `.driverId` (`types.ts:28-29`)
- `Vehicle.assignedRouteId` + `.assignedDriverId` (`types.ts:42-43`)
- `Driver.assignedVehicleId` + `.assignedRouteId` (`types.ts:55-56`)
- `ActiveTrip.routeId` + `.busId` + `.driverId` (`types.ts:120-122`)

Seeds are consistent (`route-1 ↔ veh-1 ↔ drv-1`), but the breakdown-replacement handler updates only some copies: it flips `Vehicle.status` and sets `Route.busId = reserveVehicle.id` (`App.tsx:379-389`) while leaving `Vehicle.assignedRouteId`, `Driver.assignedRouteId`, and the running `ActiveTrip.busId` untouched. After one swap the four sources disagree.
**Canonical.** Assignment lives **only** on `Trip.vehicleId` / `Trip.driverId` (the concrete run) (domain-model §4.2). `Route`/`Vehicle`/`DriverProfile` carry no live assignment. Swaps update the trip and write an `AuditEvent`.
**Migration implication.** During import, derive each `Trip`'s vehicle/driver from the seed's route triple (they agree today). Delete the redundant columns. Re-express "reserve" as `Vehicle.status = RESERVE` + `Trip` unassigned, not `assignedRouteId = ''`.

### 🔴 4. Fee model: four overlapping fields and a schedule that contradicts per-student paid amounts
**Problem.** `Student` carries `feePaid?`, `totalFee?`, `feeStatus?`, `feeAmount?` (`types.ts:80-83`). `feeAmount` is just `totalFee − feePaid` (derivable, drifts). The **global** `SEMESTER_INSTALLMENTS` = 30000 + 15000 + 10000 = 55000 (`initialData.ts:777-799`) with installments 1–2 marked `Paid` ⇒ **45000 paid**, yet every "Pending" student records `feePaid: 27000` / `feeAmount: 28000` (e.g. `initialData.ts:318-321`). **45000 ≠ 27000.** The installment schedule is a single array not linked to any student, so it cannot reflect individual payment histories.
**Canonical.** `FeeInvoice` (per student per term) → `Installment[]` → `Payment[]`; `paidAmountPkr`, `balancePkr`, and `InvoiceStatus` are **derived** from confirmed payments (domain-model §6). Invariant `SUM(installments) == invoice.total` (§9.4).
**Migration implication.** Create one invoice per student per term; seed installments from the term template (not one shared array); recompute status from payments. Expect the legacy 27000/45000 discrepancy to require a business decision on the true opening balances — **flag for finance, do not guess** (unresolved question in ADR‑011).

### 🔴 5. Guardians have no identity; children are linked by matching phone strings
**Problem.** A parent exists only as `Student.parentName?` + `Student.parentPhone?` (`types.ts:76-77`). `ParentApp.tsx` builds the sibling list with `students.filter(s => s.parentPhone === phone)`. Phone-as-foreign-key breaks when a number changes, is shared, or is formatted inconsistently (`'0301-7894561'` vs E.164), and cannot represent M:N cleanly or per-guardian permissions.
**Canonical.** `GuardianProfile` (a `User` with `primaryRole=PARENT`) linked via `StudentGuardian` (M:N, with `isPrimary`, `canTrack`) (domain-model §1.3–1.4).
**Migration implication.** For each distinct legacy `parentPhone`, create a `GuardianProfile` + `User` (invite flow), then a `StudentGuardian` row per student sharing that phone. Normalize phones to E.164. Until a guardian claims the account, tracking authorization defaults to `canTrack=false` (secure by default).

### 🟠 6. Empty-string foreign keys
**Problem.** `drv-reserve.assignedRouteId = ''` (`initialData.ts:72`) and `veh-reserve.assignedRouteId = ''` (`initialData.ts:146`). An empty string is neither a valid FK nor NULL, so joins silently drop and `NOT NULL` checks pass spuriously.
**Canonical.** Absent references are **NULL** (domain-model §9.7). Reserve = `Vehicle.status=RESERVE` / driver unassigned.
**Migration implication.** Convert `''` → NULL on import; add FK constraints that reject empty strings.

### 🟠 7. Dangling vehicle reference in seed notification
**Problem.** `notif-3` title says **"Bus B-07 Approaching Stop"** while its body says **"Coaster # 7101"** (`initialData.ts:705-706`). No vehicle `B-07` exists in `INITIAL_VEHICLES` (`initialData.ts:79-152`). The title references a non-existent entity.
**Canonical.** Notifications carry structured `refs.vehicleId` (FK) (domain-model §7.2); display text is generated from the referenced entity, so it can't contradict it.
**Migration implication.** Legacy free-text notifications can't be reliably re-linked; import them as historical `INFO` notifications **without** refs, or drop them. New notifications must set `refs`.

### 🟠 8. Notifications are weakly typed, entity-blind, and globally read
**Problem.** `NotificationItem.targetRole` is `'student'|'parent'|'driver'|'admin'|'all'| string` and `type` is `... | string` (`types.ts:229,233`) — the `| string` escape hatch defeats the union (any value type-checks). Entities are embedded in prose (`"Hamza Tariq (23F-1102) … Coaster # 7101"`, `initialData.ts:697`) with no FKs, so they can't be filtered or authorized per resource. `read: boolean` is a single global flag (`types.ts:234`) — one user reading clears it for everyone.
**Canonical.** Closed enums `NotificationType`/`Severity`; structured `refs{tripId,routeId,vehicleId,studentId}`; per-user read state via `NotificationRead(notificationId,userId)` (domain-model §7.2; api §4).
**Migration implication.** Map legacy `type` strings to the closed enum (unknown → `INFO`); drop the global `read`; seed `NotificationRead` per recipient on first fetch.

### 🟠 9. Position duplicated on Vehicle and ActiveTrip, and they diverge
**Problem.** `Vehicle.currentLat/currentLng` (`types.ts:46-47`) and `ActiveTrip.currentLat/currentLng` (`types.ts:131-132`) both claim to be "where the bus is". The simulation loop mutates **only** `activeTrips` (`App.tsx:105-134`); `Vehicle.currentLat/Lng` stays frozen at seed. Two sources of truth that disagree the moment the sim runs.
**Canonical.** Position is telemetry: append-only `LocationUpdate` keyed to `vehicleId` (+`tripId`); "current position" is the latest fix projected into `VehicleTrackingView` (domain-model §5.1, §5.3; realtime §6.1).
**Migration implication.** Delete `currentLat/Lng` from both `Vehicle` and `ActiveTrip`. Seed the simulator's starting fix from the legacy `ActiveTrip.currentLat/Lng` (the moving one), not the frozen `Vehicle` copy.

### 🟠 10. Timestamps are display/relative strings
**Problem.** Times are human strings, several **relative/lossy**: `AIRecommendation.createdAt = '10 mins ago'` (`initialData.ts:620`), `TransportHistoryItem.date = 'Today (Morning)'` (`initialData.ts:725`), `StaffPassenger.date = 'Today'` (`initialData.ts:477`), trip `startedAt = '7:15 AM'` (`initialData.ts:512`), notification `timestamp = '07:15 AM'` (`initialData.ts:689`), dates like `'04 Sep 2026'` (`initialData.ts:810`), `'15 Aug 2026'` (`initialData.ts:782`). Mixed 12h/24h. Meanwhile the tracking layer uses **epoch ms numbers** (`tracking/types.ts:61`). Two incompatible time models; relative strings can't be stored, sorted, or compared.
**Canonical.** All timestamps ISO‑8601 UTC `timestamptz` (domain-model §0; ADR‑005). Display formatting is a client concern.
**Migration implication.** Relative strings ("Today", "10 mins ago") have **no recoverable absolute value** — they must be regenerated at import time relative to the migration timestamp, or dropped. Parse the absolute ones (`'04 Sep 2026'`, `'7:15 AM'`) with an explicit campus timezone assumption (**unresolved:** confirm tz, ADR‑011).

### 🟠 11. Journey status is a single mutable field with no history
**Problem.** `Student.journeyStatus` is one value (`types.ts:78`) overwritten globally by `handleUpdateStudentStatus` (`App.tsx:159-162`). It cannot represent morning vs return simultaneously, keeps no history, and `'Picked Up'` vs `'On Board'` are redundant (`types.ts:5`). `TransportHistoryItem.status` uses a *different* enum (`'Picked Up'|'Completed'|'Absent'`, `types.ts:248`).
**Canonical.** Immutable `BoardingEvent` per (trip, rider) with a defined transition graph; current status = latest event (domain-model §4.4; api §8–9).
**Migration implication.** Seed today's status as one `BoardingEvent` per rider on the current trip; legacy `lastBoardedTime`/`lastDroppedTime` become event `occurredAt`. Collapse `Picked Up`+`On Board` → `BOARDED`.

### 🟠 12. Route carries live/per-trip state as static fields
**Problem.** `TransportRoute.direction = 'Inbound to Campus'` (`types.ts:26`; every seed route is inbound) and `TransportRoute.status = 'On Time'|'Delayed'|…` (`types.ts:31`) are static template fields, but direction is per-run and status is live. `route-3.status = 'Delayed'` (`initialData.ts:226`) duplicates `trip-3.status = 'Delayed'` (`initialData.ts:539`) — two sources for the same fact, and the route can't express its return run.
**Canonical.** `Route` is a static template (code, name, color, ordered stops). `direction` and `status` live on `Trip` (domain-model §3.2, §4.2).
**Migration implication.** Drop `direction`/`status` from `Route`; derive each legacy route's inbound `Trip` and add the reverse-order return `Trip`. Map legacy `Route.status`/`ActiveTrip.status` → `TripStatus` (`On Time`→`IN_PROGRESS` w/ `delayMinutes=0`; `Delayed`→`IN_PROGRESS` w/ `delayMinutes>0`; `Completed`→`COMPLETED`; `Standby`→`SCHEDULED`).

### 🟡 13. Three conflicting notions of "load"
**Problem.** Route‑2 stop `demand` values sum to **34** (`initialData.ts:196-212`); the AI recommendation states **27 booked / 30** (`initialData.ts:597`); only **4** students are actually seeded on route‑2 (`stu-1..4`). Separately, `App.tsx:96` computes `utilizationPercent = students.length / activeCapacity` (global, includes injected staff), and the tracking provider's `occupancy.registered = students.filter(s => s.routeId === route.id).length` (`simulatedTrackingProvider.ts:125`) — a *booking* count labeled "occupancy". None of these agree, and "occupancy" is really "registered", not "on board".
**Canonical.** Two explicit computed metrics (domain-model §5): `registeredCount` (active `RideAssignment`s for the route) and `onboardCount` (`BOARDED − ALIGHTED` for the trip). `RouteStop.demand` is removed as stored data (it is a planning estimate, not truth). Global utilization is a report aggregate (`/admin/summary`), not a per-student division.
**Migration implication.** Do not import `demand` as authoritative. Recompute all utilization from assignments/events. **Assumption to confirm (ADR‑011):** whether `demand` was an intentional planning override or stale demo data.

### 🟡 14. Return-trip schedule is non-monotonic on the forward-ordered stop list
**Problem.** Stops are ordered for the inbound run (`sequence` 1..N, Campus last). But `returnTime` on Campus (`r1-s13`) is `'3:30 PM'` (`initialData.ts:180`) — **earlier** than the first stop's `returnTime '3:40 PM'` (`initialData.ts:168`). The return trip physically departs Campus first and reaches the other stops later, i.e. in **reverse** sequence, yet the data stores return times against the forward order with no explicit reversal. Consumers must know to reverse.
**Canonical.** Store one inbound-ordered stop list; the return order is the reverse; `scheduledReturnTime` must be monotonic in the reversed order and is validated as such (domain-model §3.3).
**Migration implication.** Validate each route's return times after reversing; fix any that remain non-monotonic. `sequence` and array order must be reconciled (they agree in seed but nothing enforces it).

### 🟡 15. Passenger records reference stops by name
**Problem.** `TripPassenger.pickupStop`/`.dropStop` (`types.ts:111-112`) and `StaffPassenger.pickupStop`/`.dropStop` (`types.ts:95-96`) are **name strings** (e.g. `'Railway Station'`, `'Campus'`, `initialData.ts:475-476`). Names aren't unique across routes (e.g. "Campus", "Northern Bypass Chowk" appear on multiple routes), so they can't be joined.
**Canonical.** `BoardingEvent.stopId` / `RideAssignment.pickupStopId` are FKs (domain-model §4).
**Migration implication.** Resolve legacy stop names to `RouteStop.id` **scoped by the record's route**; ambiguous names need route context to disambiguate.

### 🟡 16. Enum drift across the same concepts
**Problem.** `TripType = 'morning'|'return'` (`types.ts:3`) vs `TransportHistoryItem.tripType = 'Morning'|'Return'` (`types.ts:241`). `StudentJourneyStatus` (`types.ts:5`) vs `TransportHistoryItem.status` (`'Picked Up'|'Completed'|'Absent'`, `types.ts:248`). Same concepts, divergent literal sets/casing.
**Canonical.** Single `TripDirection = INBOUND|RETURN`; single journey enum on `BoardingEvent` (domain-model §4.2, §4.4).
**Migration implication.** Deterministic case/value maps at import (`morning→INBOUND`, etc.); reject unmapped values into a quarantine list rather than defaulting silently.

### 🟠 17. No user/auth entity; `Role` conflates a UI screen with identity
**Problem.** `Role = 'student'|'parent'|'driver'|'admin'|'landing'` (`types.ts:1`) — `'landing'` is a screen, not a person. There is no `User`; identity fields (name/email/phone) live on `Student`/`Driver`. Auth is a mock picker: `handleSelectUser` just sets `currentRole` from `AuthModal` (`App.tsx:494-513`) with no credentials or session.
**Canonical.** `User` (auth principal) + role profiles; `primaryRole` excludes `landing` (domain-model §1.1). Real auth is a production build target (api §3) — **it does not exist today**.
**Migration implication.** Create a `User` per student/driver/guardian/admin; move identity fields off the profiles; the landing screen becomes a client route, not a role.

### 🟠 18. Staff riders are injected into the student roster
**Problem.** `handleConfirmStaffRide` builds a **`Student`** object (`isStaff:true`) with a duplicated `studentId:'FACULTY-01'` for every staff rider and a **fabricated** `pickupStopId: \`${booking.routeId}-s1\`` (string-concatenated, assumes the `route-N-sM` id format), then pushes it into `students[]` (`App.tsx:305-324`). A separate `StaffPassenger` type + seed already exist (`types.ts:90`, `initialData.ts:469-498`) but aren't used here. Staff pollute the student roster and the global utilization count.
**Canonical.** `StaffProfile` (+ `StaffRideBooking` for single trips) distinct from `StudentProfile` (domain-model §2.3). Stop references are FKs, never concatenated strings.
**Migration implication.** Migrate `INITIAL_STAFF_PASSENGERS` to `StaffProfile`; do not import runtime-injected pseudo-students. If ULIDs replace `route-N-sM`, any code synthesizing stop ids must be removed.

### 🟡 19. Client-generated, collision-prone ids and no persistence
**Problem.** Runtime ids are `notif-${Date.now()}` (`App.tsx:196`), `rc-${Date.now()}` (`App.tsx:235`), `staff-${Date.now()}` (`App.tsx:306`), `trip-extra-${Date.now()}` (`App.tsx:405`) — two events in the same millisecond collide. All state is `useState` seeded from `INITIAL_*` (`App.tsx:46-53`) and `onResetSimulation` restores `INITIAL_ACTIVE_TRIPS` (`App.tsx:568`); a refresh loses everything. Confirms the system is a **frontend prototype** with no DB.
**Canonical.** Server-assigned **ULIDs** (domain-model §0); real persistence in Postgres.
**Migration implication.** Ids are generated server-side on create; clients never mint them. No legacy runtime ids survive a refresh, so there is nothing to migrate there.

### 🟡 20. Binary fee status can't represent partial payment
**Problem.** `feeStatus: 'Paid' | 'Pending'` (`types.ts:82`) while a student has `feePaid: 27000` of `totalFee: 55000` and is labeled `'Pending'` (`initialData.ts:318-320`). Partially-paid is indistinguishable from unpaid.
**Canonical.** `InvoiceStatus = UNPAID|PARTIAL|PAID|OVERDUE`, derived from payments + due dates (domain-model §6.1).
**Migration implication.** Recompute status from the payment ledger at import; legacy `feeStatus` is not trusted.

### 🟡 21. Payment confirmation message hardcodes an amount
**Problem.** `handlePayFee` sets the student fully paid (`feePaid = totalFee||55000`, `App.tsx:217`) but the notification says **"Rs. 28,000 received"** (`App.tsx:224`) regardless of the actual amount paid. The message is decoupled from the data.
**Canonical.** Notifications are composed from the persisted `Payment.amountPkr` (domain-model §7.2).
**Migration implication.** Generate copy from real amounts; no fixed literals.

### ⚪ 22. ETA field renamed across the tracking seam
**Problem.** `calculateSmartETA` returns `confidencePercent` (`aiEngines.ts:21`) but `VehicleTracking` exposes `etaConfidence` (`tracking/types.ts:67`). Harmless today, but a rename that a shared contract should pin down.
**Canonical.** Standardize on `confidencePercent` (domain-model §5.2); the ETA wire event uses it (realtime §6.4).
**Migration implication.** The Flutter/React clients read `confidencePercent`; keep `etaConfidence` as a documented alias only if needed during transition.

---

## Migration sequencing (recommendation, not execution)

This phase performs **no migration**. When it happens, the safe order is:

1. **Stand up canonical schema** (Prisma) with FKs, uniqueness, and the §9 invariants — before importing any legacy data.
2. **People & identity first** (`User`, profiles, `StudentGuardian`) — everything else FKs to these.
3. **Network** (`Route`, `RouteStop`) with ordering/return-time validation.
4. **Assignments** (`RideAssignment`) — resolving stop-name → stop-id scoped by route (issues 2, 15).
5. **Billing** (`FeeInvoice`/`Installment`/`Payment`) — with a **finance sign-off** on opening balances (issue 4).
6. **Trips & telemetry** (`Trip`, `LocationUpdate`, `BoardingEvent`) — position/status normalized (issues 9, 11, 12).
7. **Operational records** (`Incident`, `Notification`, `RouteChangeRequest`, `AuditEvent`).
8. **Quarantine, don't guess:** any legacy value that can't be deterministically mapped (relative timestamps, ambiguous stop names, the 27k/45k fee conflict) is written to a review list for a human decision — never silently defaulted.

**Cross-cutting rule:** because the existing app has no persistence and resets on refresh, there is no production data to migrate yet — only the **seed fixtures** and their embedded assumptions. The highest-value action is to **not copy these bugs** into the new Prisma schema and Flutter models. That is the entire point of freezing this contract first.

See [`architecture-decisions.md`](./architecture-decisions.md) for the rationale (ADRs) behind each canonical choice and the open questions that still need your approval.
