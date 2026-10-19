// ─────────────────────────────────────────────────────────────────────────────
// Student transport API test suite (Phase 5). Covers the 11 required scenarios for
// `GET /me/ride`, `GET /me/trips` (+ the contract alias `/me/ride/history`) and
// `GET /me/notifications`, plus the `activeAssignment` addition to `GET /me`.
//
// Runs through `app.inject()` (no real sockets) against the isolated `viafast_test`
// database created by test/global-setup.ts. Fixtures are synthetic, namespaced by a
// per-run id, and deleted in `afterAll`; nothing here ever touches `viafast_dev`.
//
// Every request uses a UNIQUE source IP so the per-IP rate-limit counters cannot
// leak between tests (same discipline as auth.test.ts).
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { SignJWT } from "jose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  AssignmentStatus,
  BoardingEventType,
  BoardingSource,
  DriverStatus,
  EnrollmentStatus,
  NotificationType,
  RiderType,
  Severity,
  TripDirection,
  TripStatus,
  UserRole,
  UserStatus,
  VehicleType,
} from "../generated/prisma/client";
import { buildApp } from "../src/app";
import { campusServiceDate } from "../src/common/time";
import { env } from "../src/config/env";
import { signAccessToken } from "../src/security/tokens";

const runId = randomUUID().slice(0, 8);
/** Unique, run-scoped id for every fixture row. */
const fid = (name: string): string => `${runId}-${name}`;
const emailOf = (name: string): string => `${name}-${runId}@viafast.test`;
const DAY_MS = 86_400_000;
const TODAY = campusServiceDate();
const daysAgo = (n: number): Date => new Date(TODAY.getTime() - n * DAY_MS);
/** A `@db.Time` value: the UTC epoch anchored at a wall-clock time. */
const clock = (h: number, m: number): Date => new Date(Date.UTC(1970, 0, 1, h, m, 0));

let app: FastifyInstance;
let ipSeq = 0;
const uniqueIp = (): string => `10.1.0.${++ipSeq}`;

// ── identities ────────────────────────────────────────────────────────────────
let studentAUserId: string;
let studentAProfileId: string;
let studentAToken: string;
let studentBUserId: string;
let studentBProfileId: string;
let studentBToken: string;
let studentCToken: string; // STUDENT role, profile exists, NO assignment
let orphanToken: string; // STUDENT role, NO StudentProfile row
let parentToken: string; // PARENT role
const allUserIds: string[] = [];

// ── transport fixtures ────────────────────────────────────────────────────────
let termId: string;
let routeAId: string;
let routeBId: string;
let stopA1Id: string;
let stopA2Id: string;
let stopA3Id: string;
let stopB1Id: string;
let vehicleId: string;
let driverProfileId: string;
let assignmentAId: string;
let assignmentBId: string;

let todayInboundTripId: string;
let todayReturnTripId: string;
let routeBTripId: string;
const tripIds: string[] = [];

// ── notification fixtures ─────────────────────────────────────────────────────
const notificationIds: string[] = [];
let nBroadcastOnRouteA: string; // A sees, read
let nForA: string; // A sees, unread
let nUntargetedBroadcast: string; // A sees, unread
let nForParents: string; // A must NOT see (role gate)
let nForStudentB: string; // A must NOT see (ownership gate)
let nOnOtherRoute: string; // A must NOT see (relevance gate)

const DRIVERS_PHONE = "+923001234567";
const DRIVERS_LICENSE = `LIC-${runId}`;

async function makeUser(name: string, role: UserRole): Promise<string> {
  const user = await app.prisma.user.create({
    data: { email: emailOf(name), primaryRole: role, status: UserStatus.ACTIVE },
    select: { id: true },
  });
  allUserIds.push(user.id);
  return user.id;
}

async function tokenFor(userId: string): Promise<string> {
  return (await signAccessToken(userId)).token;
}

beforeAll(async () => {
  app = await buildApp({ logger: false });
  await app.ready();

  // ── users ────────────────────────────────────────────────────────────────────
  studentAUserId = await makeUser("student-a", UserRole.STUDENT);
  studentBUserId = await makeUser("student-b", UserRole.STUDENT);
  const studentCUserId = await makeUser("student-c", UserRole.STUDENT);
  const orphanUserId = await makeUser("orphan", UserRole.STUDENT); // no profile, deliberately
  const parentUserId = await makeUser("parent", UserRole.PARENT);
  const driverUserId = await makeUser("driver", UserRole.DRIVER);

  studentAToken = await tokenFor(studentAUserId);
  studentBToken = await tokenFor(studentBUserId);
  studentCToken = await tokenFor(studentCUserId);
  orphanToken = await tokenFor(orphanUserId);
  parentToken = await tokenFor(parentUserId);

  // ── student profiles ─────────────────────────────────────────────────────────
  const profileA = await app.prisma.studentProfile.create({
    data: {
      id: fid("sp-a"),
      userId: studentAUserId,
      studentNumber: `S-A-${runId}`,
      fullName: "Ayesha Test",
      department: "Computer Science",
      semester: "Fall 2026",
      enrollmentStatus: EnrollmentStatus.ACTIVE,
    },
    select: { id: true },
  });
  studentAProfileId = profileA.id;

  const profileB = await app.prisma.studentProfile.create({
    data: {
      id: fid("sp-b"),
      userId: studentBUserId,
      studentNumber: `S-B-${runId}`,
      fullName: "Bilal Test",
      department: "Electrical Engineering",
      semester: "Fall 2026",
      enrollmentStatus: EnrollmentStatus.ACTIVE,
    },
    select: { id: true },
  });
  studentBProfileId = profileB.id;

  // Student C has a profile but NO RideAssignment (documented empty state).
  await app.prisma.studentProfile.create({
    data: {
      id: fid("sp-c"),
      userId: studentCUserId,
      studentNumber: `S-C-${runId}`,
      fullName: "Cyrus Test",
      department: "Mathematics",
      semester: "Fall 2026",
      enrollmentStatus: EnrollmentStatus.ACTIVE,
    },
  });

  // ── term, routes, stops, vehicle, driver ─────────────────────────────────────
  termId = (
    await app.prisma.term.create({
      data: {
        id: fid("term"),
        code: `TERM-${runId}`,
        name: "Test Term",
        startDate: daysAgo(30),
        endDate: new Date(TODAY.getTime() + 60 * DAY_MS),
      },
      select: { id: true },
    })
  ).id;

  routeAId = (
    await app.prisma.route.create({
      data: { id: fid("route-a"), code: `TA-${runId}`, name: "Test Corridor A", colorHex: "#1B5E20" },
      select: { id: true },
    })
  ).id;

  routeBId = (
    await app.prisma.route.create({
      data: { id: fid("route-b"), code: `TB-${runId}`, name: "Test Corridor B", colorHex: "#0D47A1" },
      select: { id: true },
    })
  ).id;

  const stopsA = await app.prisma.routeStop.createManyAndReturn({
    data: [
      {
        id: fid("stop-a1"), routeId: routeAId, sequence: 1, name: "Campus Gate",
        latitude: 24.8607, longitude: 67.0011, distanceFromOriginKm: 0,
        scheduledInboundTime: clock(7, 30), scheduledReturnTime: clock(16, 0),
      },
      {
        id: fid("stop-a2"), routeId: routeAId, sequence: 2, name: "Midtown Pickup",
        latitude: 24.8707, longitude: 67.0111, distanceFromOriginKm: 4.2,
        scheduledInboundTime: clock(7, 45), scheduledReturnTime: clock(15, 45),
      },
      {
        id: fid("stop-a3"), routeId: routeAId, sequence: 3, name: "University Block C",
        latitude: 24.8807, longitude: 67.0211, distanceFromOriginKm: 9.8,
        scheduledInboundTime: clock(8, 10), scheduledReturnTime: clock(15, 20),
      },
    ],
    select: { id: true, sequence: true },
  });
  stopA1Id = stopsA.find((s) => s.sequence === 1)!.id;
  stopA2Id = stopsA.find((s) => s.sequence === 2)!.id;
  stopA3Id = stopsA.find((s) => s.sequence === 3)!.id;

  stopB1Id = (
    await app.prisma.routeStop.create({
      data: {
        id: fid("stop-b1"), routeId: routeBId, sequence: 1, name: "North Terminal",
        latitude: 24.9, longitude: 67.05, distanceFromOriginKm: 0,
      },
      select: { id: true },
    })
  ).id;

  vehicleId = (
    await app.prisma.vehicle.create({
      data: {
        id: fid("veh"), plateNumber: `PLT-${runId}`, vehicleType: VehicleType.COASTER, seatCapacity: 22,
      },
      select: { id: true },
    })
  ).id;

  driverProfileId = (
    await app.prisma.driverProfile.create({
      data: {
        id: fid("drv"), userId: driverUserId, fullName: "Driver Test",
        phoneE164: DRIVERS_PHONE, licenseNumber: DRIVERS_LICENSE,
        ratingAvg: 4.5, employmentStatus: DriverStatus.ACTIVE,
      },
      select: { id: true },
    })
  ).id;

  // ── ride assignments ─────────────────────────────────────────────────────────
  assignmentAId = (
    await app.prisma.rideAssignment.create({
      data: {
        id: fid("ra-a"), riderType: RiderType.STUDENT, studentId: studentAProfileId,
        routeId: routeAId, pickupStopId: stopA2Id, dropStopId: stopA3Id, termId,
        status: AssignmentStatus.ACTIVE, effectiveFrom: daysAgo(10), effectiveTo: null,
      },
      select: { id: true },
    })
  ).id;

  assignmentBId = (
    await app.prisma.rideAssignment.create({
      data: {
        id: fid("ra-b"), riderType: RiderType.STUDENT, studentId: studentBProfileId,
        routeId: routeBId, pickupStopId: stopB1Id, dropStopId: stopB1Id, termId,
        status: AssignmentStatus.ACTIVE, effectiveFrom: daysAgo(10), effectiveTo: null,
      },
      select: { id: true },
    })
  ).id;

  // ── trips ────────────────────────────────────────────────────────────────────
  // Today's pair on corridor A (what /me/ride reports), corridor B's run (student B's),
  // and three past corridor-A runs that give student A a paginatable history.
  const trips = await app.prisma.trip.createManyAndReturn({
    data: [
      {
        id: fid("trip-today-in"), routeId: routeAId, serviceDate: TODAY, direction: TripDirection.INBOUND,
        vehicleId, driverId: driverProfileId, status: TripStatus.BOARDING, delayMinutes: 4,
        scheduledDepartureAt: new Date(TODAY.getTime() + 7 * 3_600_000),
        scheduledArrivalAt: new Date(TODAY.getTime() + 8.5 * 3_600_000),
      },
      {
        id: fid("trip-today-ret"), routeId: routeAId, serviceDate: TODAY, direction: TripDirection.RETURN,
        vehicleId, driverId: driverProfileId, status: TripStatus.SCHEDULED, delayMinutes: 0,
        scheduledDepartureAt: new Date(TODAY.getTime() + 15.5 * 3_600_000),
        scheduledArrivalAt: new Date(TODAY.getTime() + 17 * 3_600_000),
      },
      {
        id: fid("trip-b-today"), routeId: routeBId, serviceDate: TODAY, direction: TripDirection.INBOUND,
        status: TripStatus.SCHEDULED, delayMinutes: 0,
        scheduledDepartureAt: new Date(TODAY.getTime() + 7 * 3_600_000),
        scheduledArrivalAt: new Date(TODAY.getTime() + 8 * 3_600_000),
      },
      {
        id: fid("trip-h1"), routeId: routeAId, serviceDate: daysAgo(3), direction: TripDirection.INBOUND,
        vehicleId, driverId: driverProfileId, status: TripStatus.COMPLETED, delayMinutes: 0,
        scheduledDepartureAt: new Date(daysAgo(3).getTime() + 7 * 3_600_000),
        scheduledArrivalAt: new Date(daysAgo(3).getTime() + 8.5 * 3_600_000),
      },
      {
        id: fid("trip-h2"), routeId: routeAId, serviceDate: daysAgo(2), direction: TripDirection.INBOUND,
        vehicleId, driverId: driverProfileId, status: TripStatus.COMPLETED, delayMinutes: 5,
        scheduledDepartureAt: new Date(daysAgo(2).getTime() + 7 * 3_600_000),
        scheduledArrivalAt: new Date(daysAgo(2).getTime() + 8.5 * 3_600_000),
      },
      {
        id: fid("trip-h3"), routeId: routeAId, serviceDate: daysAgo(1), direction: TripDirection.INBOUND,
        vehicleId, driverId: driverProfileId, status: TripStatus.COMPLETED, delayMinutes: 0,
        scheduledDepartureAt: new Date(daysAgo(1).getTime() + 7 * 3_600_000),
        scheduledArrivalAt: new Date(daysAgo(1).getTime() + 8.5 * 3_600_000),
      },
    ],
    select: { id: true },
  });
  tripIds.push(...trips.map((t) => t.id));
  todayInboundTripId = fid("trip-today-in");
  todayReturnTripId = fid("trip-today-ret");
  routeBTripId = fid("trip-b-today");

  // ── boarding events (the journey records history is derived from) ────────────
  const at = (tripDate: Date, hourOffset: number): Date =>
    new Date(tripDate.getTime() + hourOffset * 3_600_000);

  await app.prisma.boardingEvent.createMany({
    data: [
      // Today's inbound: student A is WAITING (still open) => ride.journeyStatus WAITING.
      { id: fid("be-today-a"), tripId: todayInboundTripId, riderType: RiderType.STUDENT, studentId: studentAProfileId, stopId: stopA2Id, event: BoardingEventType.WAITING, source: BoardingSource.DRIVER, occurredAt: at(TODAY, 7.1) },
      // Today's corridor-B run belongs to student B only.
      { id: fid("be-today-b"), tripId: routeBTripId, riderType: RiderType.STUDENT, studentId: studentBProfileId, stopId: stopB1Id, event: BoardingEventType.BOARDED, source: BoardingSource.DRIVER, occurredAt: at(TODAY, 7.2) },
      // H1: full journey for A => COMPLETED.
      { id: fid("be-h1-1"), tripId: fid("trip-h1"), riderType: RiderType.STUDENT, studentId: studentAProfileId, stopId: stopA2Id, event: BoardingEventType.BOARDED, source: BoardingSource.DRIVER, occurredAt: at(daysAgo(3), 7.2) },
      { id: fid("be-h1-2"), tripId: fid("trip-h1"), riderType: RiderType.STUDENT, studentId: studentAProfileId, stopId: stopA3Id, event: BoardingEventType.ALIGHTED, source: BoardingSource.DRIVER, occurredAt: at(daysAgo(3), 8.2) },
      // H2: boarded but never alighted => IN_PROGRESS.
      { id: fid("be-h2-1"), tripId: fid("trip-h2"), riderType: RiderType.STUDENT, studentId: studentAProfileId, stopId: stopA2Id, event: BoardingEventType.BOARDED, source: BoardingSource.DRIVER, occurredAt: at(daysAgo(2), 7.2) },
      // H3: no-show => NO_SHOW, and it is the ONLY event for that trip.
      { id: fid("be-h3-1"), tripId: fid("trip-h3"), riderType: RiderType.STUDENT, studentId: studentAProfileId, stopId: stopA2Id, event: BoardingEventType.NO_SHOW, source: BoardingSource.DRIVER, occurredAt: at(daysAgo(1), 7.3) },
    ],
  });

  // ── notifications ────────────────────────────────────────────────────────────
  const base = (id: string, title: string) => ({
    id,
    type: NotificationType.INFO,
    severity: Severity.LOW,
    title,
    body: `Body of ${title}`,
  });
  const notifications = await app.prisma.notification.createManyAndReturn({
    data: [
      // Visible to A: broadcast on A's active route. Marked READ for A's user.
      { ...base(fid("not-route-a"), "Route A delay"), audienceRole: null, routeId: routeAId, studentId: null, tripId: null, createdAt: new Date(Date.now() - 5 * 60_000) },
      // Visible to A: personally addressed. Unread.
      { ...base(fid("not-for-a"), "Your fee receipt"), audienceRole: UserRole.STUDENT, routeId: null, studentId: studentAProfileId, tripId: null, createdAt: new Date(Date.now() - 4 * 60_000) },
      // Visible to A: untargeted broadcast. Unread.
      { ...base(fid("not-broadcast"), "Campus holiday"), audienceRole: null, routeId: null, studentId: null, tripId: null, createdAt: new Date(Date.now() - 3 * 60_000) },
      // NOT visible to A: addressed to PARENTs (role gate).
      { ...base(fid("not-parents"), "Guardian briefing"), audienceRole: UserRole.PARENT, routeId: routeAId, studentId: null, tripId: null, createdAt: new Date(Date.now() - 2 * 60_000) },
      // NOT visible to A: addressed to student B (ownership gate).
      { ...base(fid("not-for-b"), "Bilal only"), audienceRole: UserRole.STUDENT, routeId: null, studentId: studentBProfileId, tripId: null, createdAt: new Date(Date.now() - 60_000) },
      // NOT visible to A: student-audience alert on a corridor A is not assigned to (relevance gate).
      { ...base(fid("not-other-route"), "Corridor B closure"), audienceRole: UserRole.STUDENT, routeId: routeBId, studentId: null, tripId: null, createdAt: new Date() },
    ],
    select: { id: true },
  });
  notificationIds.push(...notifications.map((n) => n.id));
  nBroadcastOnRouteA = fid("not-route-a");
  nForA = fid("not-for-a");
  nUntargetedBroadcast = fid("not-broadcast");
  nForParents = fid("not-parents");
  nForStudentB = fid("not-for-b");
  nOnOtherRoute = fid("not-other-route");

  // Per-user read state (ADR-025): the SAME notification is read for A and unread
  // for B, and vice versa, proving `read` is per-viewer and never a global flag.
  await app.prisma.notificationRead.createMany({
    data: [
      { id: fid("read-a"), notificationId: nBroadcastOnRouteA, userId: studentAUserId },
      { id: fid("read-b"), notificationId: nUntargetedBroadcast, userId: studentBUserId },
    ],
  });
}, 180_000);

afterAll(async () => {
  try {
    // Delete in FK-safe order (many of these relations are onDelete: Restrict).
    // `defined()` keeps cleanup working if beforeAll failed part-way through.
    const defined = (values: Array<string | undefined>): string[] =>
      values.filter((v): v is string => typeof v === "string");
    await app.prisma.notificationRead.deleteMany({ where: { id: { startsWith: `${runId}-` } } });
    await app.prisma.notification.deleteMany({ where: { id: { in: defined(notificationIds) } } });
    await app.prisma.boardingEvent.deleteMany({ where: { id: { startsWith: `${runId}-` } } });
    await app.prisma.trip.deleteMany({ where: { id: { in: defined(tripIds) } } });
    await app.prisma.rideAssignment.deleteMany({ where: { id: { in: defined([assignmentAId, assignmentBId]) } } });
    await app.prisma.routeStop.deleteMany({ where: { routeId: { startsWith: `${runId}-` } } });
    await app.prisma.route.deleteMany({ where: { id: { in: defined([routeAId, routeBId]) } } });
    await app.prisma.vehicle.deleteMany({ where: { id: { in: defined([vehicleId]) } } });
    await app.prisma.driverProfile.deleteMany({ where: { id: { in: defined([driverProfileId]) } } });
    await app.prisma.studentProfile.deleteMany({ where: { id: { startsWith: `${runId}-` } } });
    await app.prisma.term.deleteMany({ where: { id: { in: defined([termId]) } } });
    await app.prisma.user.deleteMany({ where: { id: { in: defined(allUserIds) } } });
  } finally {
    await app.close();
  }
}, 180_000);

/** GET with the caller's bearer token and a fresh source IP. */
async function get(url: string, token: string | null) {  return app.inject({
    method: "GET",
    url,
    remoteAddress: uniqueIp(),
    ...(token ? { headers: { authorization: `Bearer ${token}` } } : {}),
  });
}

/** Index a notification page by id so assertions can name a fixture directly. */
interface NotifLite {
  id: string;
  read: boolean;
}
const indexById = (rows: NotifLite[]): Map<string, NotifLite> =>
  new Map<string, NotifLite>(rows.map((row) => [row.id, row] as [string, NotifLite]));

/** Every key in a parsed JSON body, recursively (for leak assertions). */
function allKeys(value: unknown, acc: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const item of value) allKeys(item, acc);
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      acc.push(key);
      allKeys(child, acc);
    }
  }
  return acc;
}

describe("Phase 5 — Student transport API", () => {
  // ── Scenario 1: unauthenticated ─────────────────────────────────────────────
  it("1. rejects unauthenticated callers on every Student endpoint with 401", async () => {
    // A well-formed token for an account that does not exist must fail too:
    // `authenticate` re-reads the user row rather than trusting the claim.
    const stale = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setSubject(fid("deleted-user"))
      .setIssuer(env.tokenIssuer)
      .setAudience(env.tokenAudience)
      .setIssuedAt()
      .setExpirationTime("15m")
      .setJti(randomUUID())
      .sign(env.accessTokenSecretBytes);

    for (const url of ["/api/v1/me/ride", "/api/v1/me/trips", "/api/v1/me/notifications"]) {
      const anonymous = await get(url, null);
      expect(anonymous.statusCode).toBe(401);
      expect(anonymous.json().error).toMatchObject({ code: "UNAUTHENTICATED" });
      expect(anonymous.headers["x-request-id"]).toBeTruthy();

      const staleRes = await get(url, stale);
      expect(staleRes.statusCode).toBe(401);
      expect(staleRes.json().error.code).toBe("UNAUTHENTICATED");
    }
  });

  // ── Scenario 2: valid student retrieves their ride ──────────────────────────
  it("2. returns the current effective assignment, stops, trips and journey status for a student", async () => {
    const res = await get("/api/v1/me/ride", studentAToken);
    expect(res.statusCode).toBe(200);
    const body = res.json();

    expect(body.student).toMatchObject({
      studentProfileId: studentAProfileId,
      studentNumber: `S-A-${runId}`,
      fullName: "Ayesha Test",
      enrollmentStatus: "ACTIVE",
    });
    expect(body.term).toMatchObject({ id: termId, code: `TERM-${runId}` });

    expect(body.assignment).toMatchObject({
      id: assignmentAId,
      routeId: routeAId,
      status: "ACTIVE",
    });
    expect(body.assignment.route).toMatchObject({ code: `TA-${runId}`, name: "Test Corridor A" });
    // Ordered route stops, inbound order, with the stop clock times rendered HH:MM.
    expect(body.assignment.route.stops.map((s: { sequence: number }) => s.sequence)).toEqual([1, 2, 3]);
    expect(body.assignment.route.stops[0]).toMatchObject({
      id: stopA1Id,
      name: "Campus Gate",
      scheduledInboundTime: "07:30",
      scheduledReturnTime: "16:00",
    });
    expect(body.assignment.pickupStop).toMatchObject({ id: stopA2Id, name: "Midtown Pickup", sequence: 2, scheduledInboundTime: "07:45" });
    expect(body.assignment.dropStop).toMatchObject({ id: stopA3Id, name: "University Block C", sequence: 3 });

    // Vehicle + driver are exposed for the day's trips — and nothing sensitive about them.
    expect(body.trips.inbound).toMatchObject({
      tripId: todayInboundTripId,
      direction: "INBOUND",
      status: "BOARDING",
      delayMinutes: 4,
      serviceDate: TODAY.toISOString().slice(0, 10),
    });
    expect(body.trips.inbound.vehicle).toMatchObject({ id: vehicleId, plateNumber: `PLT-${runId}`, vehicleType: "COASTER", seatCapacity: 22 });
    expect(body.trips.inbound.driver).toEqual({ id: driverProfileId, fullName: "Driver Test", ratingAvg: 4.5 });
    expect(body.trips.return).toMatchObject({ tripId: todayReturnTripId, direction: "RETURN", status: "SCHEDULED" });

    // No tracking provider exists in this phase: the key is present and honestly null.
    expect(body.trips.inbound).toHaveProperty("tracking");
    expect(body.trips.inbound.tracking).toBeNull();
    expect(body.trips.return.tracking).toBeNull();

    // journeyStatus is the LATEST boarding event for the open trip (domain-model §4.4).
    expect(body.journeyStatus).toBe("WAITING");
  });

  // ── Scenario 3: no active assignment ────────────────────────────────────────
  it("3. returns a documented empty state (200 + nulls) for a student with no active assignment", async () => {
    const res = await get("/api/v1/me/ride", studentCToken);
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.assignment).toBeNull();
    expect(body.term).toBeNull();
    expect(body.trips).toEqual({ inbound: null, return: null });
    expect(body.journeyStatus).toBeNull();
    // The caller's own identity is still reported — nothing is fabricated.
    expect(body.student.studentNumber).toBe(`S-C-${runId}`);
  });

  it("3b. an assignment outside its effective window is not treated as current", async () => {
    // Close student A's assignment, then re-open it afterwards.
    await app.prisma.rideAssignment.update({
      where: { id: assignmentAId },
      data: { effectiveTo: daysAgo(1) },
    });
    try {
      const res = await get("/api/v1/me/ride", studentAToken);
      expect(res.statusCode).toBe(200);
      expect(res.json().assignment).toBeNull();

      const me = await get("/api/v1/me", studentAToken);
      expect(me.json().activeAssignment).toBeUndefined();
    } finally {
      await app.prisma.rideAssignment.update({
        where: { id: assignmentAId },
        data: { effectiveTo: null },
      });
    }
  });

  // ── Scenario 4: no student profile / wrong role ─────────────────────────────
  it("4. denies a STUDENT-role account with no StudentProfile (403)", async () => {
    for (const url of ["/api/v1/me/ride", "/api/v1/me/trips", "/api/v1/me/notifications"]) {
      const res = await get(url, orphanToken);
      expect(res.statusCode).toBe(403);
      expect(res.json().error.code).toBe("FORBIDDEN");
    }
  });

  it("4b. denies a PARENT-role caller on the Student surface (403)", async () => {
    for (const url of ["/api/v1/me/ride", "/api/v1/me/trips", "/api/v1/me/notifications"]) {
      const res = await get(url, parentToken);
      expect(res.statusCode).toBe(403);
      expect(res.json().error.code).toBe("FORBIDDEN");
    }
  });

  // ── Scenario 5: cross-student isolation ─────────────────────────────────────
  it("5. never returns another student's ride, history or notifications", async () => {
    const rideA = (await get("/api/v1/me/ride", studentAToken)).json();
    const rideB = (await get("/api/v1/me/ride", studentBToken)).json();
    expect(rideA.assignment.id).toBe(assignmentAId);
    expect(rideB.assignment.id).toBe(assignmentBId);
    expect(rideA.assignment.routeId).not.toBe(rideB.assignment.routeId);
    expect(JSON.stringify(rideA)).not.toContain(studentBProfileId);
    expect(JSON.stringify(rideB)).not.toContain(studentAProfileId);

    const tripsA = (await get("/api/v1/me/trips", studentAToken)).json();
    const tripsB = (await get("/api/v1/me/trips", studentBToken)).json();
    const idsA = tripsA.data.map((t: { tripId: string }) => t.tripId);
    const idsB = tripsB.data.map((t: { tripId: string }) => t.tripId);
    expect(idsA).not.toContain(routeBTripId);
    expect(idsB).toEqual([routeBTripId]);

    const notifsA = (await get("/api/v1/me/notifications", studentAToken)).json();
    const notifsB = (await get("/api/v1/me/notifications", studentBToken)).json();
    const titlesA = notifsA.data.map((n: { id: string }) => n.id);
    expect(titlesA).not.toContain(nForStudentB);
    expect(notifsB.data.map((n: { id: string }) => n.id)).not.toContain(nForA);
  });

  it("5b. ignores a client-supplied studentId / role in the query string", async () => {
    // Nothing the client sends may select whose data is returned.
    const spoof = await get(
      `/api/v1/me/ride?studentId=${studentBProfileId}&userId=${studentBUserId}&role=ADMIN`,
      studentAToken,
    );
    expect(spoof.statusCode).toBe(200);
    expect(spoof.json().assignment.id).toBe(assignmentAId);

    const spoofHistory = await get(
      `/api/v1/me/trips?studentId=${studentBProfileId}`,
      studentAToken,
    );
    expect(spoofHistory.statusCode).toBe(200);
    expect(spoofHistory.json().data.map((t: { tripId: string }) => t.tripId)).not.toContain(routeBTripId);

    const spoofNotifs = await get(
      `/api/v1/me/notifications?studentId=${studentBProfileId}&audienceRole=PARENT`,
      studentAToken,
    );
    expect(spoofNotifs.statusCode).toBe(200);
    const ids = spoofNotifs.json().data.map((n: { id: string }) => n.id);
    expect(ids).not.toContain(nForStudentB);
    expect(ids).not.toContain(nForParents);
  });

  // ── Scenario 6: history scoping + pagination ────────────────────────────────
  it("6. scopes trip history to the caller and paginates deterministically", async () => {
    const page1 = await get("/api/v1/me/trips?limit=2", studentAToken);
    expect(page1.statusCode).toBe(200);
    const first = page1.json();
    expect(first.data).toHaveLength(2);
    expect(first.page.hasMore).toBe(true);
    expect(first.page.nextCursor).toBeTypeOf("string");

    // DESC by serviceDate: today's run, then the most recent past run.
    expect(first.data.map((t: { tripId: string }) => t.tripId)).toEqual([todayInboundTripId, fid("trip-h3")]);
    expect(first.data[0]).toMatchObject({
      direction: "INBOUND",
      routeCode: `TA-${runId}`,
      plateNumber: `PLT-${runId}`,
      pickupStopName: "Midtown Pickup",
      outcome: "WAITING",
      delayMinutes: 4,
      boardedAt: null,
      alightedAt: null,
    });
    // H3 is a no-show: the ONLY event, so no boarded/alighted instants.
    expect(first.data[1]).toMatchObject({ tripId: fid("trip-h3"), outcome: "NO_SHOW", boardedAt: null, alightedAt: null, pickupStopName: "Midtown Pickup" });

    const page2 = await get(`/api/v1/me/trips?limit=2&cursor=${encodeURIComponent(first.page.nextCursor)}`, studentAToken);
    expect(page2.statusCode).toBe(200);
    const second = page2.json();
    expect(second.data.map((t: { tripId: string }) => t.tripId)).toEqual([fid("trip-h2"), fid("trip-h1")]);
    expect(second.page.hasMore).toBe(false);
    expect(second.page.nextCursor).toBeNull();

    // H2 boarded but never alighted => IN_PROGRESS; H1 completed the journey.
    expect(second.data[0]).toMatchObject({ outcome: "IN_PROGRESS", delayMinutes: 5 });
    expect(second.data[0].boardedAt).toBeTruthy();
    expect(second.data[0].alightedAt).toBeNull();
    expect(second.data[1]).toMatchObject({ outcome: "COMPLETED", delayMinutes: 0 });
    expect(second.data[1].boardedAt).toBeTruthy();
    expect(second.data[1].alightedAt).toBeTruthy();

    // No duplicate trips even though H1 has TWO boarding events (scenario 6's core risk).
    const all = (await get("/api/v1/me/trips?limit=100", studentAToken)).json();
    const allIds = all.data.map((t: { tripId: string }) => t.tripId);
    expect(allIds).toHaveLength(new Set(allIds).size);
    expect(allIds).toHaveLength(4);
    expect(all.page.hasMore).toBe(false);

    // Date filters use the contract's from/to.
    const filtered = (await get(`/api/v1/me/trips?from=${daysAgo(3).toISOString().slice(0, 10)}&to=${daysAgo(2).toISOString().slice(0, 10)}`, studentAToken)).json();
    expect(filtered.data.map((t: { tripId: string }) => t.tripId)).toEqual([fid("trip-h2"), fid("trip-h1")]);

    // The canonical contract path behaves identically to the alias.
    const canonical = await get("/api/v1/me/ride/history?limit=2", studentAToken);
    expect(canonical.statusCode).toBe(200);
    expect(canonical.json()).toEqual(first);
  });

  // ── Scenario 7: notifications scoping + read state ──────────────────────────
  it("7. returns only authorized notifications with per-viewer read state", async () => {
    const res = await get("/api/v1/me/notifications?limit=100", studentAToken);
    expect(res.statusCode).toBe(200);
    const body = res.json();
    const ids = body.data.map((n: { id: string }) => n.id);

    expect(ids).toContain(nBroadcastOnRouteA); // broadcast on A's active route
    expect(ids).toContain(nForA); // personally addressed to A
    expect(ids).toContain(nUntargetedBroadcast); // untargeted broadcast
    expect(ids).not.toContain(nForParents); // role gate: audienceRole PARENT
    expect(ids).not.toContain(nForStudentB); // ownership gate: another student
    expect(ids).not.toContain(nOnOtherRoute); // relevance gate: another corridor

    const byId = indexById(body.data as NotifLite[]);
    expect(byId.get(nBroadcastOnRouteA)!.read).toBe(true);
    expect(byId.get(nForA)!.read).toBe(false);
    expect(byId.get(nUntargetedBroadcast)!.read).toBe(false);

    // The SAME untargeted broadcast is read for B and unread for A: `read` is
    // per-viewer (NotificationRead), never a global flag on the notification.
    const asB = (await get("/api/v1/me/notifications?limit=100", studentBToken)).json();
    const bById = indexById(asB.data as NotifLite[]);
    expect(bById.get(nUntargetedBroadcast)!.read).toBe(true);
    expect(bById.has(nForStudentB)).toBe(true);
    // B rides corridor B, so a corridor-A route alert is not B's to see.
    expect(bById.has(nBroadcastOnRouteA)).toBe(false);

    // Shape matches the contract item exactly.
    expect(body.data[0]).toMatchObject({
      type: expect.any(String),
      severity: expect.any(String),
      title: expect.any(String),
      body: expect.any(String),
    });
    expect(body.data[0]).toHaveProperty("createdAt");
    expect(body.data[0]).toHaveProperty("refs");
    expect(Object.keys(body.data[0].refs).sort()).toEqual(["routeId", "studentId", "tripId"]);
  });

  it("7b. paginates notifications newest-first with an opaque cursor", async () => {
    const page1 = (await get("/api/v1/me/notifications?limit=2", studentAToken)).json();
    expect(page1.data).toHaveLength(2);
    expect(page1.page.hasMore).toBe(true);

    const page2 = (await get(`/api/v1/me/notifications?limit=2&cursor=${encodeURIComponent(page1.page.nextCursor)}`, studentAToken)).json();
    expect(page2.data).toHaveLength(1);
    expect(page2.page.hasMore).toBe(false);

    const combined = [...page1.data, ...page2.data].map((n: { id: string }) => n.id);
    expect(combined).toHaveLength(new Set(combined).size);
    // Deterministic DESC ordering across the page boundary.
    const stamps = [...page1.data, ...page2.data].map((n: { createdAt: string }) => Date.parse(n.createdAt));
    expect(stamps).toEqual([...stamps].sort((a, b) => b - a));
  });

  // ── Scenario 8: empty collections ───────────────────────────────────────────
  it("8. returns consistent empty collections with the contract page envelope", async () => {
    // Student C has no assignment and no journey records at all.
    const trips = await get("/api/v1/me/trips", studentCToken);
    expect(trips.statusCode).toBe(200);
    expect(trips.json()).toEqual({ data: [], page: { nextCursor: null, hasMore: false } });

    // A date window that matches nothing yields the identical empty envelope.
    const window = await get(
      `/api/v1/me/trips?from=${daysAgo(400).toISOString().slice(0, 10)}&to=${daysAgo(300).toISOString().slice(0, 10)}`,
      studentAToken,
    );
    expect(window.statusCode).toBe(200);
    expect(window.json()).toEqual({ data: [], page: { nextCursor: null, hasMore: false } });

    // C has no active route, so route- and student-scoped notifications are
    // unreachable; only genuinely untargeted broadcasts come through.
    const notifs = await get("/api/v1/me/notifications", studentCToken);
    expect(notifs.statusCode).toBe(200);
    expect(notifs.json().data.map((n: { id: string }) => n.id)).toEqual([nUntargetedBroadcast]);
    expect(notifs.json().page).toEqual({ nextCursor: null, hasMore: false });
  });

  // ── Scenario 9: invalid pagination ──────────────────────────────────────────
  it("9. rejects invalid pagination with a 400 VALIDATION_FAILED envelope", async () => {
    const bad = [
      "/api/v1/me/trips?limit=0",
      "/api/v1/me/trips?limit=101",
      "/api/v1/me/trips?limit=abc",
      "/api/v1/me/trips?limit=-5",
      "/api/v1/me/trips?limit=1e3",
      "/api/v1/me/trips?cursor=not-a-real-cursor",
      "/api/v1/me/trips?cursor=" + Buffer.from('{"serviceDate":"nope"}').toString("base64url"),
      "/api/v1/me/trips?from=2026-13-45",
      "/api/v1/me/trips?from=not-a-date",
      "/api/v1/me/trips?from=2026-03-10&to=2026-03-01",
      "/api/v1/me/notifications?limit=0",
      "/api/v1/me/notifications?limit=9999",
    ];
    for (const url of bad) {
      const res = await get(url, studentAToken);
      expect(res.statusCode, url).toBe(400);
      const envelope = res.json().error;
      expect(envelope.code, url).toBe("VALIDATION_FAILED");
      expect(Array.isArray(envelope.details), url).toBe(true);
      expect(envelope.requestId, url).toBeTruthy();
    }
  });

  it("9b. accepts the documented limits and defaults", async () => {
    expect((await get("/api/v1/me/trips?limit=1", studentAToken)).statusCode).toBe(200);
    expect((await get("/api/v1/me/trips?limit=100", studentAToken)).statusCode).toBe(200);
    const defaulted = (await get("/api/v1/me/trips", studentAToken)).json();
    expect(defaulted.data).toHaveLength(4); // fewer than the 25 default => one page
    expect(defaulted.page.hasMore).toBe(false);
  });

  // ── Scenario 10: no sensitive data in any payload ───────────────────────────
  it("10. exposes no password hashes, tokens, driver PII or unrelated user data", async () => {
    const responses = [
      await get("/api/v1/me/ride", studentAToken),
      await get("/api/v1/me/trips?limit=100", studentAToken),
      await get("/api/v1/me/notifications?limit=100", studentAToken),
      await get("/api/v1/me", studentAToken),
    ];

    const FORBIDDEN_KEYS = [
      "passwordHash", "tokenHash", "refreshToken", "accessToken",
      "phoneE164", "licenseNumber", "licenseClass", "experienceYears",
      "userId", "recordedByUserId", "deletedAt", "revokedAt",
    ];
    for (const res of responses) {
      expect(res.statusCode).toBe(200);
      const keys = allKeys(res.json());
      for (const forbidden of FORBIDDEN_KEYS) {
        expect(keys, `unexpected key ${forbidden}`).not.toContain(forbidden);
      }
      // Raw secret material must never appear anywhere in the body.
      expect(res.body).not.toContain(DRIVERS_PHONE);
      expect(res.body).not.toContain(DRIVERS_LICENSE);
      expect(res.body).not.toContain("postgresql://");
      expect(res.body).not.toContain(env.accessTokenSecret);
      expect(res.body).not.toContain(studentBUserId);
    }
    // The driver projection is exactly the three contract fields.
    expect(Object.keys(responses[0]!.json().trips.inbound.driver).sort()).toEqual([
      "fullName", "id", "ratingAvg",
    ]);
  });

  // ── GET /me: the activeAssignment addition ──────────────────────────────────
  it("11. GET /me adds activeAssignment for a student and nothing else", async () => {
    const res = await get("/api/v1/me", studentAToken);
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.user).toMatchObject({ id: studentAUserId, primaryRole: "STUDENT", status: "ACTIVE" });
    expect(body.student).toMatchObject({ id: studentAProfileId, fullName: "Ayesha Test" });
    expect(body.activeAssignment).toEqual({
      id: assignmentAId,
      routeId: routeAId,
      pickupStopId: stopA2Id,
      dropStopId: stopA3Id,
    });
    // Student-specific detail stays in /me/ride, not /me.
    expect(JSON.stringify(body)).not.toContain("Test Corridor A");
    expect(body.activeAssignment).not.toHaveProperty("route");
    expect(body).not.toHaveProperty("currentTripId");
    expect(body).not.toHaveProperty("linkedStudents");

    // A student without an assignment gets no key at all (rather than a null stub).
    const noAssignment = await get("/api/v1/me", studentCToken);
    expect(noAssignment.statusCode).toBe(200);
    expect(noAssignment.json().activeAssignment).toBeUndefined();

    // Non-student callers are unaffected by the change.
    const parent = await get("/api/v1/me", parentToken);
    expect(parent.statusCode).toBe(200);
    expect(parent.json().activeAssignment).toBeUndefined();
    expect(parent.json().user.primaryRole).toBe("PARENT");
  });
});
