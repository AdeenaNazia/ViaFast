// ─────────────────────────────────────────────────────────────────────────────
// Student self-service read models (api-contract §4).
//
// AUTHORIZATION (api-contract §2, ADR-003/ADR-008). Every function here takes the
// authenticated `User` (or a student-profile id resolved from it) and derives the
// student identity from `StudentProfile.userId` — the UNIQUE 1:1 link. A
// client-supplied student id, student number, name, phone or route label is never
// accepted as an input to these queries, so there is no way to ask for somebody
// else's ride, history or notifications. Every Prisma query below is scoped by that
// server-resolved id.
//
// HONESTY (ADR-007/ADR-009). Nothing is fabricated: an absent assignment is
// `assignment: null`, an absent trip is `null`, and `tracking` is always `null`
// because no TrackingProvider/ingestion service exists in this phase. Position,
// occupancy and ETA are derived subsystems that are NOT implemented here, so they
// are not returned at all rather than returned as plausible-looking guesses.
// ─────────────────────────────────────────────────────────────────────────────
import type { Prisma, PrismaClient } from "../../../generated/prisma/client";
import {
  AssignmentStatus,
  RiderType,
  TripDirection,
  TripStatus,
  type BoardingEventType,
  type EnrollmentStatus,
  type NotificationType,
  type Severity,
  type VehicleType,
} from "../../../generated/prisma/client";
import type { AuthenticatedUser } from "../../common/auth-context";
import {
  buildPage,
  cursorDate,
  cursorString,
  DEFAULT_PAGE_LIMIT,
  decodeCursor,
  type Paginated,
} from "../../common/pagination";
import { campusServiceDate, toClockTime, toServiceDateIso } from "../../common/time";
import { AppError } from "../../errors/app-error";
import type { NotificationsQuery, RideHistoryQuery } from "./student.schemas";

/** Thrown for a STUDENT-role account that has no `StudentProfile` row. */
const NO_STUDENT_PROFILE = "Your account is not linked to a student record.";

// ══════════════════════════════ STUDENT CONTEXT ══════════════════════════════

export interface StudentContext {
  studentProfileId: string;
  studentNumber: string;
  fullName: string;
  enrollmentStatus: EnrollmentStatus;
}

/**
 * Resolve the caller's OWN student profile from the authenticated user id.
 * This is the single entry point to the Student surface: if it returns, the rest
 * of the module can scope every query to `studentProfileId` without further checks.
 */
export async function requireStudentContext(
  prisma: PrismaClient,
  user: AuthenticatedUser,
): Promise<StudentContext> {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
    select: { id: true, studentNumber: true, fullName: true, enrollmentStatus: true },
  });
  if (!profile) throw AppError.forbidden(NO_STUDENT_PROFILE);
  return {
    studentProfileId: profile.id,
    studentNumber: profile.studentNumber,
    fullName: profile.fullName,
    enrollmentStatus: profile.enrollmentStatus,
  };
}

// ═══════════════════════════ CURRENT ASSIGNMENT ══════════════════════════════

/**
 * "Currently effective" = the authoritative `RideAssignment` (domain-model §4.1):
 * riderType STUDENT, status ACTIVE, not soft-deleted, and inside its effective
 * window. The migration's partial unique index guarantees at most one such
 * open-ended row per (student, term); the ordering below makes the choice
 * deterministic even if a term-scoped or windowed row also exists.
 */
function currentAssignmentWhere(
  studentProfileId: string,
  today: Date,
): Prisma.RideAssignmentWhereInput {
  return {
    studentId: studentProfileId,
    riderType: RiderType.STUDENT,
    status: AssignmentStatus.ACTIVE,
    deletedAt: null,
    AND: [
      { OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: today } }] },
      { OR: [{ effectiveTo: null }, { effectiveTo: { gte: today } }] },
    ],
  };
}

const CURRENT_ASSIGNMENT_ORDER = [
  { effectiveFrom: { sort: "desc" as const, nulls: "last" as const } },
  { createdAt: "desc" as const },
  { id: "desc" as const },
];

/** The 4 id fields `GET /me` exposes as `activeAssignment` (api-contract §3). */
export interface ActiveAssignmentRef {
  id: string;
  routeId: string;
  pickupStopId: string;
  dropStopId: string;
}

export async function findActiveAssignmentRef(
  prisma: PrismaClient,
  studentProfileId: string,
  today: Date = campusServiceDate(),
): Promise<ActiveAssignmentRef | null> {
  const row = await prisma.rideAssignment.findFirst({
    where: currentAssignmentWhere(studentProfileId, today),
    orderBy: CURRENT_ASSIGNMENT_ORDER,
    select: { id: true, routeId: true, pickupStopId: true, dropStopId: true },
  });
  return row;
}

// ══════════════════════════════ GET /me/ride ═════════════════════════════════

export interface RideStopDto {
  id: string;
  sequence: number;
  name: string;
  latitude: number;
  longitude: number;
  scheduledInboundTime: string | null;
  scheduledReturnTime: string | null;
}

export interface RidePickupStopDto {
  id: string;
  name: string;
  sequence: number;
  scheduledInboundTime: string | null;
}

export interface RideDropStopDto {
  id: string;
  name: string;
  sequence: number;
}

export interface RideRouteDto {
  code: string;
  name: string;
  colorHex: string;
  /** Ordered by `sequence` (the INBOUND order); RETURN is the reverse (§3.3). */
  stops: RideStopDto[];
}

export interface RideTermDto {
  id: string;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
}

export interface RideAssignmentDto {
  id: string;
  routeId: string;
  status: AssignmentStatus;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  route: RideRouteDto;
  pickupStop: RidePickupStopDto;
  dropStop: RideDropStopDto;
}

export interface RideVehicleDto {
  id: string;
  plateNumber: string;
  vehicleType: VehicleType;
  seatCapacity: number;
}

export interface RideDriverDto {
  /** DriverProfile id. Deliberately NO phone number and NO licence number. */
  id: string;
  fullName: string;
  ratingAvg: number | null;
}

export interface RideTripDto {
  tripId: string;
  serviceDate: string;
  direction: TripDirection;
  status: TripStatus;
  scheduledDepartureAt: Date;
  scheduledArrivalAt: Date;
  delayMinutes: number;
  vehicle: RideVehicleDto | null;
  driver: RideDriverDto | null;
  /**
   * Always `null` in this phase. The contract reserves this slot for the
   * `VehicleTrackingView` projection (domain-model §5.3), which needs a
   * TrackingProvider plus the position/occupancy/ETA services. None exist yet
   * (ADR-001/ADR-009), and the database holds no live GPS feed, so the field is
   * present-but-null instead of being populated with invented telemetry.
   */
  tracking: null;
}

export interface RideResponse {
  student: StudentContext;
  term: RideTermDto | null;
  assignment: RideAssignmentDto | null;
  trips: { inbound: RideTripDto | null; return: RideTripDto | null };
  /** Latest `BoardingEvent.event` for the current trip, or null (derived, §4.4). */
  journeyStatus: BoardingEventType | null;
}

const TRIP_SELECT = {
  id: true,
  serviceDate: true,
  direction: true,
  status: true,
  scheduledDepartureAt: true,
  scheduledArrivalAt: true,
  delayMinutes: true,
  vehicle: { select: { id: true, plateNumber: true, vehicleType: true, seatCapacity: true } },
  driver: { select: { id: true, fullName: true, ratingAvg: true } },
} satisfies Prisma.TripSelect;

type TripRow = Prisma.TripGetPayload<{ select: typeof TRIP_SELECT }>;

function toRideTrip(row: TripRow): RideTripDto {
  return {
    tripId: row.id,
    serviceDate: toServiceDateIso(row.serviceDate),
    direction: row.direction,
    status: row.status,
    scheduledDepartureAt: row.scheduledDepartureAt,
    scheduledArrivalAt: row.scheduledArrivalAt,
    delayMinutes: row.delayMinutes,
    vehicle: row.vehicle
      ? {
          id: row.vehicle.id,
          plateNumber: row.vehicle.plateNumber,
          vehicleType: row.vehicle.vehicleType,
          seatCapacity: row.vehicle.seatCapacity,
        }
      : null,
    driver: row.driver
      ? { id: row.driver.id, fullName: row.driver.fullName, ratingAvg: row.driver.ratingAvg }
      : null,
    tracking: null,
  };
}

/** Trip statuses that are not yet finished, i.e. the ride a student is waiting on. */
const OPEN_TRIP_STATUSES = new Set<TripStatus>([
  TripStatus.SCHEDULED,
  TripStatus.BOARDING,
  TripStatus.IN_PROGRESS,
]);

/**
 * The trip `journeyStatus` describes: the earliest of today's trips that has not
 * finished, or — once the whole service day is over — the last one, so the day's
 * final outcome is still reported. Deterministic; no wall-clock guessing.
 */
function pickCurrentTrip(trips: RideTripDto[]): RideTripDto | null {
  if (trips.length === 0) return null;
  const ordered = [...trips].sort(
    (a, b) => a.scheduledDepartureAt.getTime() - b.scheduledDepartureAt.getTime(),
  );
  return ordered.find((trip) => OPEN_TRIP_STATUSES.has(trip.status)) ?? ordered[ordered.length - 1]!;
}

export async function getStudentRide(
  prisma: PrismaClient,
  context: StudentContext,
  now: Date = new Date(),
): Promise<RideResponse> {
  const today = campusServiceDate(now);

  const assignment = await prisma.rideAssignment.findFirst({
    where: currentAssignmentWhere(context.studentProfileId, today),
    orderBy: CURRENT_ASSIGNMENT_ORDER,
    select: {
      id: true,
      routeId: true,
      status: true,
      effectiveFrom: true,
      effectiveTo: true,
      term: { select: { id: true, code: true, name: true, startDate: true, endDate: true } },
      route: {
        select: {
          code: true,
          name: true,
          colorHex: true,
          stops: {
            orderBy: { sequence: "asc" },
            select: {
              id: true,
              sequence: true,
              name: true,
              latitude: true,
              longitude: true,
              scheduledInboundTime: true,
              scheduledReturnTime: true,
            },
          },
        },
      },
      pickupStop: { select: { id: true, name: true, sequence: true, scheduledInboundTime: true } },
      dropStop: { select: { id: true, name: true, sequence: true } },
    },
  });

  if (!assignment) {
    // Documented empty state: a student with no current assignment is still
    // authorized, so this is a 200 with nulls — never a fabricated assignment.
    return {
      student: context,
      term: null,
      assignment: null,
      trips: { inbound: null, return: null },
      journeyStatus: null,
    };
  }

  // UNIQUE(routeId, serviceDate, direction) ⇒ at most one row per direction.
  const todaysTrips = await prisma.trip.findMany({
    where: { routeId: assignment.routeId, serviceDate: today },
    select: TRIP_SELECT,
    orderBy: { scheduledDepartureAt: "asc" },
  });
  const mapped = todaysTrips.map(toRideTrip);
  const inbound = mapped.find((trip) => trip.direction === TripDirection.INBOUND) ?? null;
  const returning = mapped.find((trip) => trip.direction === TripDirection.RETURN) ?? null;

  const currentTrip = pickCurrentTrip(mapped);
  let journeyStatus: BoardingEventType | null = null;
  if (currentTrip) {
    const latest = await prisma.boardingEvent.findFirst({
      where: {
        tripId: currentTrip.tripId,
        studentId: context.studentProfileId,
        riderType: RiderType.STUDENT,
      },
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      select: { event: true },
    });
    journeyStatus = latest?.event ?? null;
  }

  return {
    student: context,
    term: assignment.term
      ? {
          id: assignment.term.id,
          code: assignment.term.code,
          name: assignment.term.name,
          startDate: toServiceDateIso(assignment.term.startDate),
          endDate: toServiceDateIso(assignment.term.endDate),
        }
      : null,
    assignment: {
      id: assignment.id,
      routeId: assignment.routeId,
      status: assignment.status,
      effectiveFrom: assignment.effectiveFrom ? toServiceDateIso(assignment.effectiveFrom) : null,
      effectiveTo: assignment.effectiveTo ? toServiceDateIso(assignment.effectiveTo) : null,
      route: {
        code: assignment.route.code,
        name: assignment.route.name,
        colorHex: assignment.route.colorHex,
        stops: assignment.route.stops.map((stop) => ({
          id: stop.id,
          sequence: stop.sequence,
          name: stop.name,
          latitude: stop.latitude,
          longitude: stop.longitude,
          scheduledInboundTime: toClockTime(stop.scheduledInboundTime),
          scheduledReturnTime: toClockTime(stop.scheduledReturnTime),
        })),
      },
      pickupStop: {
        id: assignment.pickupStop.id,
        name: assignment.pickupStop.name,
        sequence: assignment.pickupStop.sequence,
        scheduledInboundTime: toClockTime(assignment.pickupStop.scheduledInboundTime),
      },
      dropStop: {
        id: assignment.dropStop.id,
        name: assignment.dropStop.name,
        sequence: assignment.dropStop.sequence,
      },
    },
    trips: { inbound, return: returning },
    journeyStatus,
  };
}

// ═══════════════════════════ TRIP HISTORY (paged) ════════════════════════════

/**
 * The rider's outcome for one trip, derived from the LATEST `BoardingEvent`
 * (domain-model §4.4). `ALIGHTED` is the contract's `COMPLETED`; the other values
 * are the canonical `BoardingEventType` names, so no vocabulary is invented.
 */
export type TripOutcome = "COMPLETED" | "IN_PROGRESS" | "WAITING" | "ABSENT" | "NO_SHOW";

export interface TripHistoryItem {
  tripId: string;
  serviceDate: string;
  direction: TripDirection;
  routeCode: string;
  plateNumber: string | null;
  pickupStopName: string | null;
  boardedAt: Date | null;
  alightedAt: Date | null;
  outcome: TripOutcome;
  delayMinutes: number;
}

const OUTCOME_BY_EVENT: Record<BoardingEventType, TripOutcome> = {
  WAITING: "WAITING",
  BOARDED: "IN_PROGRESS",
  ALIGHTED: "COMPLETED",
  ABSENT: "ABSENT",
  NO_SHOW: "NO_SHOW",
};

const TRIP_HISTORY_SELECT = {
  id: true,
  serviceDate: true,
  direction: true,
  delayMinutes: true,
  scheduledDepartureAt: true,
  route: { select: { code: true } },
  vehicle: { select: { plateNumber: true } },
} satisfies Prisma.TripSelect;

type TripHistoryRow = Prisma.TripGetPayload<{ select: typeof TRIP_HISTORY_SELECT }>;

function tripHistoryCursor(row: TripHistoryRow) {
  return {
    serviceDate: row.serviceDate.getTime(),
    departureAt: row.scheduledDepartureAt.getTime(),
    id: row.id,
  };
}

/** Keyset predicate matching the (serviceDate, scheduledDepartureAt, id) DESC order. */
function tripHistoryKeyset(cursor: string): Prisma.TripWhereInput {
  const values = decodeCursor(cursor);
  const serviceDate = cursorDate(values, "serviceDate");
  const departureAt = cursorDate(values, "departureAt");
  const id = cursorString(values, "id");
  return {
    OR: [
      { serviceDate: { lt: serviceDate } },
      { serviceDate, scheduledDepartureAt: { lt: departureAt } },
      { serviceDate, scheduledDepartureAt: departureAt, id: { lt: id } },
    ],
  };
}

interface JourneyEvents {
  boardedAt: Date | null;
  alightedAt: Date | null;
  pickupStopName: string | null;
  outcome: TripOutcome;
}

/**
 * Collapse a rider's append-only events for one trip into the history columns.
 * Events arrive ordered by `occurredAt ASC`, so the LAST one is the current state.
 */
function summarizeJourney(
  events: Array<{ event: BoardingEventType; occurredAt: Date; stopName: string }>,
): JourneyEvents {
  let boardedAt: Date | null = null;
  let alightedAt: Date | null = null;
  let pickupStopName: string | null = null;

  for (const event of events) {
    if (event.event === "BOARDED") {
      boardedAt ??= event.occurredAt;
      pickupStopName ??= event.stopName;
    } else if (event.event === "ALIGHTED") {
      alightedAt ??= event.occurredAt;
    }
  }
  // No BOARDED event: fall back to where the rider was first recorded (e.g. WAITING).
  pickupStopName ??= events[0]?.stopName ?? null;

  const last = events[events.length - 1];
  return {
    boardedAt,
    alightedAt,
    pickupStopName,
    outcome: last ? OUTCOME_BY_EVENT[last.event] : "WAITING",
  };
}

/**
 * Trip history derived from `BoardingEvent` + `Trip` (api-contract §4).
 *
 * Scoping: the trip set is filtered by `boardingEvents: { some: { studentId } }`,
 * which (a) restricts results to trips THIS student has a journey record on and
 * (b) yields one row per trip — querying through the events themselves would
 * return a trip once per event and duplicate it. Ordering is
 * `serviceDate DESC, scheduledDepartureAt DESC, id DESC`, so pagination is stable
 * and `id` breaks every tie.
 */
export async function listStudentTripHistory(
  prisma: PrismaClient,
  studentProfileId: string,
  query: RideHistoryQuery,
): Promise<Paginated<TripHistoryItem>> {
  const limit = query.limit ?? DEFAULT_PAGE_LIMIT;

  const filters: Prisma.TripWhereInput[] = [
    { boardingEvents: { some: { studentId: studentProfileId, riderType: RiderType.STUDENT } } },
  ];
  if (query.from !== undefined || query.to !== undefined) {
    filters.push({
      serviceDate: {
        ...(query.from !== undefined ? { gte: query.from } : {}),
        ...(query.to !== undefined ? { lte: query.to } : {}),
      },
    });
  }
  if (query.cursor !== undefined) filters.push(tripHistoryKeyset(query.cursor));

  const rows = await prisma.trip.findMany({
    where: { AND: filters },
    orderBy: [{ serviceDate: "desc" }, { scheduledDepartureAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    select: TRIP_HISTORY_SELECT,
  });

  const { rows: pageRows, page } = buildPage(rows, limit, tripHistoryCursor);
  if (pageRows.length === 0) return { data: [], page };

  const events = await prisma.boardingEvent.findMany({
    where: {
      studentId: studentProfileId,
      riderType: RiderType.STUDENT,
      tripId: { in: pageRows.map((row) => row.id) },
    },
    orderBy: [{ occurredAt: "asc" }, { id: "asc" }],
    select: { tripId: true, event: true, occurredAt: true, stop: { select: { name: true } } },
  });

  const byTrip = new Map<string, Array<{ event: BoardingEventType; occurredAt: Date; stopName: string }>>();
  for (const event of events) {
    const list = byTrip.get(event.tripId);
    const entry = { event: event.event, occurredAt: event.occurredAt, stopName: event.stop.name };
    if (list) list.push(entry);
    else byTrip.set(event.tripId, [entry]);
  }

  const data = pageRows.map((row) => {
    const journey = summarizeJourney(byTrip.get(row.id) ?? []);
    return {
      tripId: row.id,
      serviceDate: toServiceDateIso(row.serviceDate),
      direction: row.direction,
      routeCode: row.route.code,
      plateNumber: row.vehicle?.plateNumber ?? null,
      pickupStopName: journey.pickupStopName,
      boardedAt: journey.boardedAt,
      alightedAt: journey.alightedAt,
      outcome: journey.outcome,
      delayMinutes: row.delayMinutes,
    };
  });

  return { data, page };
}

// ══════════════════════════ NOTIFICATIONS (paged) ════════════════════════════

export interface NotificationItem {
  id: string;
  type: NotificationType;
  severity: Severity;
  title: string;
  body: string;
  createdAt: Date;
  /** Per-user read state from `NotificationRead` (ADR-025), never a global flag. */
  read: boolean;
  refs: { tripId: string | null; routeId: string | null; studentId: string | null };
}

const NOTIFICATION_SELECT = {
  id: true,
  type: true,
  severity: true,
  title: true,
  body: true,
  createdAt: true,
  tripId: true,
  routeId: true,
  studentId: true,
} satisfies Prisma.NotificationSelect;

/**
 * Visibility under the canonical notification model (domain-model §7.2,
 * realtime-contract §6.6). A notification reaches this caller only when ALL of:
 *
 *  1. ROLE GATE — `audienceRole` is NULL (broadcast) or equals the caller's
 *     `primaryRole`. A PARENT- or ADMIN-addressed notification is never shown to
 *     a student, and vice versa.
 *  2. OWNERSHIP GATE — if `studentId` is set it must be the caller's own profile,
 *     so a notification individually addressed to another student is invisible.
 *  3. RELEVANCE GATE — a personally-addressed notification (studentId = caller)
 *     needs nothing else. Otherwise each transport ref must resolve to the route
 *     of the caller's ACTIVE assignment: a route-scoped or trip-scoped alert for
 *     another corridor is not theirs to see. With no active assignment, only
 *     untargeted broadcasts match.
 *
 * The gates are combined with AND (narrowest reading). Realtime §6.6 phrases
 * delivery as "audience match OR authorized ref"; AND-composition is used here
 * because over-exposure is a privacy defect while under-exposure is a relevance
 * one, and the OR reading would leak role-targeted alerts (e.g. an
 * `audienceRole=PARENT` route alert) to every rider on that route.
 */
function notificationVisibilityWhere(
  user: AuthenticatedUser,
  studentProfileId: string,
  activeRouteId: string | null,
): Prisma.NotificationWhereInput {
  const routeScope: Prisma.NotificationWhereInput =
    activeRouteId === null
      ? { routeId: null }
      : { OR: [{ routeId: null }, { routeId: activeRouteId }] };
  const tripScope: Prisma.NotificationWhereInput =
    activeRouteId === null
      ? { tripId: null }
      : { OR: [{ tripId: null }, { trip: { routeId: activeRouteId } }] };

  return {
    AND: [
      { OR: [{ audienceRole: null }, { audienceRole: user.primaryRole }] },
      { OR: [{ studentId: null }, { studentId: studentProfileId }] },
      { OR: [{ studentId: studentProfileId }, { AND: [routeScope, tripScope] }] },
    ],
  };
}

function notificationKeyset(cursor: string): Prisma.NotificationWhereInput {
  const values = decodeCursor(cursor);
  const createdAt = cursorDate(values, "createdAt");
  const id = cursorString(values, "id");
  return {
    OR: [
      { createdAt: { lt: createdAt } },
      { createdAt, id: { lt: id } },
    ],
  };
}

export async function listStudentNotifications(
  prisma: PrismaClient,
  user: AuthenticatedUser,
  studentProfileId: string,
  query: NotificationsQuery,
): Promise<Paginated<NotificationItem>> {
  const limit = query.limit ?? DEFAULT_PAGE_LIMIT;
  const today = campusServiceDate();
  const activeRouteId = (await findActiveAssignmentRef(prisma, studentProfileId, today))?.routeId ?? null;

  const filters: Prisma.NotificationWhereInput[] = [
    notificationVisibilityWhere(user, studentProfileId, activeRouteId),
  ];
  if (query.cursor !== undefined) filters.push(notificationKeyset(query.cursor));

  const rows = await prisma.notification.findMany({
    where: { AND: filters },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    select: {
      ...NOTIFICATION_SELECT,
      reads: { where: { userId: user.id }, select: { readAt: true }, take: 1 },
    },
  });

  const { rows: pageRows, page } = buildPage(rows, limit, (row) => ({
    createdAt: row.createdAt.getTime(),
    id: row.id,
  }));

  const data = pageRows.map((row) => ({
    id: row.id,
    type: row.type,
    severity: row.severity,
    title: row.title,
    body: row.body,
    createdAt: row.createdAt,
    read: row.reads.length > 0,
    refs: { tripId: row.tripId, routeId: row.routeId, studentId: row.studentId },
  }));

  return { data, page };
}
