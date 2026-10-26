// ─────────────────────────────────────────────────────────────────────────────
// Development-provisioning suite for the synthetic Student fixture.
//
// Runs against the SAME isolated `viafast_test` database the rest of the suite
// uses (created and migrated by test/global-setup.ts). It never touches
// `viafast_dev`, and the two refusal scenarios exercise the guard WITHOUT any
// write: `provisionDevStudent` checks its target before opening a transaction.
//
// The fixture owns every row whose id starts with `dev-`. Both hooks clear that
// prefix, so a run is reproducible even if a previous one was interrupted, and
// nothing here can collide with the `runId`-scoped fixtures of the other suites.
//
// Rate limiting: @fastify/rate-limit keys on the source IP and AUTH_RATE_LIMIT_MAX
// is 5 in the test environment, so every request uses a unique address.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TripDirection, UserRole } from "../generated/prisma/client";
import { buildApp } from "../src/app";
import { campusServiceDate, toServiceDateIso } from "../src/common/time";
import {
  checkDevTarget,
  DEV_STUDENT_FIXTURE as F,
  DEV_STUDENT_PASSWORD_ENV_VAR,
  devBoardingEventId,
  devTripId,
  MIN_DEV_PASSWORD_LENGTH,
  provisionDevStudent,
  type DevStudentProvisionSummary,
} from "../src/dev/provision-dev-student";

const runId = randomUUID().slice(0, 8);

/** Per-run development password: never a reusable literal that could ship. */
const DEV_PASSWORD = `DevPass-${runId}!`;
const ROTATED_PASSWORD = `DevPass2-${runId}!`;
const GENERIC = "Invalid credentials.";

let app: FastifyInstance;
let TODAY: Date;

/** Rows created by these tests that the `dev-` prefix cleanup does not own. */
const extraUserIds: string[] = [];

let ipSeq = 0;
const uniqueIp = (): string => `10.4.0.${++ipSeq}`;

/** FK-safe removal of everything this suite owns, in dependency order. */
async function clearFixtures(): Promise<void> {
  const devPrefix = { id: { startsWith: "dev-" } } as const;
  await app.prisma.notificationRead.deleteMany({ where: { userId: { startsWith: "dev-" } } });
  await app.prisma.notification.deleteMany({ where: devPrefix });
  await app.prisma.boardingEvent.deleteMany({ where: devPrefix });
  await app.prisma.trip.deleteMany({ where: devPrefix });
  await app.prisma.rideAssignment.deleteMany({ where: devPrefix });
  await app.prisma.routeStop.deleteMany({ where: devPrefix });
  await app.prisma.route.deleteMany({ where: devPrefix });
  await app.prisma.vehicle.deleteMany({ where: devPrefix });
  await app.prisma.driverProfile.deleteMany({ where: devPrefix });
  await app.prisma.term.deleteMany({ where: devPrefix });
  await app.prisma.refreshToken.deleteMany({ where: { userId: { startsWith: "dev-" } } });
  await app.prisma.studentProfile.deleteMany({ where: devPrefix });
  await app.prisma.user.deleteMany({ where: devPrefix });
  if (extraUserIds.length > 0) {
    await app.prisma.user.deleteMany({ where: { id: { in: extraUserIds } } });
    extraUserIds.length = 0;
  }
}

/** Snapshot of the row population, used to prove nothing unrelated was touched. */
async function snapshotTables() {
  const ids = async (rows: Array<{ id: string }>): Promise<string[]> =>
    rows.map((row) => row.id).sort();
  return {
    users: await ids(await app.prisma.user.findMany({ select: { id: true } })),
    studentProfiles: await ids(await app.prisma.studentProfile.findMany({ select: { id: true } })),
    assignments: await ids(await app.prisma.rideAssignment.findMany({ select: { id: true } })),
    trips: await ids(await app.prisma.trip.findMany({ select: { id: true } })),
    routes: await ids(await app.prisma.route.findMany({ select: { id: true } })),
    notifications: await ids(await app.prisma.notification.findMany({ select: { id: true } })),
    boardingEvents: await ids(await app.prisma.boardingEvent.findMany({ select: { id: true } })),
    feeInvoices: await app.prisma.feeInvoice.count(),
    installments: await app.prisma.installment.count(),
    payments: await app.prisma.payment.count(),
    locationUpdates: await app.prisma.locationUpdate.count(),
    etaEstimates: await app.prisma.etaEstimate.count(),
  };
}

/** Ids present in `after` but not `before`. */
function added(before: string[], after: string[]): string[] {
  return after.filter((id) => !before.includes(id));
}

beforeAll(async () => {
  app = await buildApp({ logger: false });
  await app.ready();
  TODAY = campusServiceDate();
  await clearFixtures();
}, 120_000);

afterAll(async () => {
  try {
    await clearFixtures();
  } finally {
    await app.close();
  }
}, 120_000);

describe("target-safety guard (pure, no database)", () => {
  it("1. refuses to run under NODE_ENV=production", () => {
    const result = checkDevTarget("production", "postgresql://u:p@localhost:5432/viafast_dev");
    expect(result.safe).toBe(false);
    if (!result.safe) expect(result.reason).toMatch(/production/i);
  });

  it("2. refuses when DATABASE_URL is absent", () => {
    const result = checkDevTarget("development", undefined);
    expect(result.safe).toBe(false);
    if (!result.safe) expect(result.reason).toMatch(/DATABASE_URL/);
  });

  it("3. refuses a database name that is not recognisably dev/test/local", () => {
    for (const name of ["viafast", "viafast_prod", "university_transport"]) {
      const result = checkDevTarget("development", `postgresql://u:p@localhost:5432/${name}`);
      expect(result.safe).toBe(false);
    }
  });

  it("4. accepts a development, test or local database outside production", () => {
    for (const name of ["viafast_dev", "viafast_test", "viafast_local"]) {
      const result = checkDevTarget("development", `postgresql://u:p@localhost:5432/${name}`);
      expect(result.safe).toBe(true);
      if (result.safe) expect(result.databaseName).toBe(name);
    }
  });
});

describe("provisioning refuses unsafe targets before writing", () => {
  it("5. throws under a production configuration and creates nothing", async () => {
    const before = await snapshotTables();
    await expect(
      provisionDevStudent(app.prisma, {
        password: DEV_PASSWORD,
        nodeEnv: "production",
        databaseUrl: process.env.DATABASE_URL,
      }),
    ).rejects.toThrow(/production/i);

    const after = await snapshotTables();
    expect(after.users).toEqual(before.users);
    expect(after.studentProfiles).toEqual(before.studentProfiles);
    expect(after.trips).toEqual(before.trips);
    expect(after.assignments).toEqual(before.assignments);
  });

  it("6. throws when the configured database is not a development database", async () => {
    // Derived from the real connection string by swapping ONLY the database name,
    // so no credentials are hard-coded (or printed) here.
    const url = new URL(process.env.DATABASE_URL!);
    url.pathname = "/viafast";

    const before = await snapshotTables();
    await expect(
      provisionDevStudent(app.prisma, {
        password: DEV_PASSWORD,
        nodeEnv: "test",
        databaseUrl: url.toString(),
      }),
    ).rejects.toThrow(/cannot be safely identified as a dev/i);

    const after = await snapshotTables();
    expect(after.users).toEqual(before.users);
    expect(after.studentProfiles).toEqual(before.studentProfiles);
  });

  it("7. rejects a password shorter than the minimum", async () => {
    await expect(
      provisionDevStudent(app.prisma, {
        password: "a".repeat(MIN_DEV_PASSWORD_LENGTH - 1),
      }),
    ).rejects.toThrow(/must be between/);
  });

  it("8. aborts rather than hijack an account already holding the fixture email", async () => {
    const impostorId = `${runId}-impostor`;
    extraUserIds.push(impostorId);
    await app.prisma.user.create({
      data: {
        id: impostorId,
        email: F.email, // someone else's account already owns this address
        passwordHash: "$argon2id$v=19$m=19456,t=2,p=1$impostor$impostor",
        primaryRole: UserRole.STUDENT,
      },
      select: { id: true },
    });

    const before = await snapshotTables();
    await expect(provisionDevStudent(app.prisma, { password: DEV_PASSWORD })).rejects.toThrow(
      /never overwrites an account it does not own/i,
    );

    // The impostor is untouched and the fixture user was not created.
    const impostor = await app.prisma.user.findUnique({ where: { id: impostorId } });
    expect(impostor?.email).toBe(F.email);
    expect(await app.prisma.user.findUnique({ where: { id: F.userId } })).toBeNull();
    const after = await snapshotTables();
    expect(added(before.users, after.users)).toEqual([]);

    await app.prisma.user.deleteMany({ where: { id: impostorId } });
  });
});

describe("provisioned development Student", () => {
  let summary: DevStudentProvisionSummary;
  let accessToken = "";

  it("9. provisions the fixture and returns a summary with no secret material", async () => {
    const before = await snapshotTables();
    summary = await provisionDevStudent(app.prisma, { password: DEV_PASSWORD });

    expect(summary).toMatchObject({
      userId: F.userId,
      studentProfileId: F.studentProfileId,
      email: F.email,
      studentNumber: F.studentNumber,
      role: UserRole.STUDENT,
      routeCode: F.routeCode,
      assignmentId: F.assignmentId,
      notificationId: F.notificationId,
      serviceDate: toServiceDateIso(TODAY),
      alreadyProvisioned: false,
    });
    expect(summary.inboundTripId).toBe(devTripId(TripDirection.INBOUND, TODAY));
    expect(summary.returnTripId).toBe(devTripId(TripDirection.RETURN, TODAY));

    // The service date is derived, never a hardcoded historical day.
    expect(summary.serviceDate).toBe(toServiceDateIso(campusServiceDate()));

    // No plaintext, no hash, no credential in anything the caller receives.
    const serialized = JSON.stringify(summary);
    expect(serialized).not.toContain(DEV_PASSWORD);
    expect(serialized).not.toContain("$argon2");
    expect(Object.keys(summary)).not.toContain("password");
    expect(Object.keys(summary)).not.toContain("passwordHash");

    // Only `dev-` rows were added, and no financial or telemetry record at all.
    const after = await snapshotTables();
    for (const id of [
      ...added(before.users, after.users),
      ...added(before.studentProfiles, after.studentProfiles),
      ...added(before.assignments, after.assignments),
      ...added(before.trips, after.trips),
      ...added(before.routes, after.routes),
      ...added(before.notifications, after.notifications),
      ...added(before.boardingEvents, after.boardingEvents),
    ]) {
      expect(id.startsWith("dev-")).toBe(true);
    }
    expect(after.feeInvoices).toBe(before.feeInvoices);
    expect(after.installments).toBe(before.installments);
    expect(after.payments).toBe(before.payments);
    expect(after.locationUpdates).toBe(before.locationUpdates);
    expect(after.etaEstimates).toBe(before.etaEstimates);
  });

  it("10. stores an Argon2id hash and never the plaintext", async () => {
    const row = await app.prisma.user.findUnique({ where: { id: F.userId } });
    const storedHash = row?.passwordHash;
    expect(storedHash).toBeTypeOf("string");
    expect(storedHash!.startsWith("$argon2id$")).toBe(true);
    expect(storedHash!).not.toBe(DEV_PASSWORD);
    expect(storedHash!).not.toContain(DEV_PASSWORD);
    expect(row!.status).toBe("ACTIVE");
    expect(row!.primaryRole).toBe(UserRole.STUDENT);

    const event = await app.prisma.boardingEvent.findUnique({
      where: { id: devBoardingEventId(TODAY) },
    });
    expect(event).toMatchObject({
      tripId: devTripId(TripDirection.INBOUND, TODAY),
      studentId: F.studentProfileId,
      event: "BOARDED",
      source: "SYSTEM", // nothing claims a driver action that never happened
    });
  });

  it("11. authenticates through the real login endpoint", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      remoteAddress: uniqueIp(),
      payload: { identifier: F.email, password: DEV_PASSWORD },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.accessToken).toBeTypeOf("string");
    expect(body.refreshToken).toBeTypeOf("string");
    expect(body.user).toMatchObject({ id: F.userId, email: F.email, primaryRole: "STUDENT" });
    // The wire response leaks neither the plaintext nor the stored hash.
    expect(res.body).not.toContain(DEV_PASSWORD);
    expect(res.body).not.toContain("$argon2");
    expect(body.user).not.toHaveProperty("passwordHash");
    accessToken = body.accessToken as string;
  });

  it("12. still rejects a wrong password with the generic 401", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      remoteAddress: uniqueIp(),
      payload: { identifier: F.email, password: `Wrong-${runId}-Password!` },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toMatchObject({ code: "UNAUTHENTICATED", message: GENERIC });
  });

  it("13. reaches GET /me with the issued access token", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/me",
      remoteAddress: uniqueIp(),
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.user).toMatchObject({ id: F.userId, primaryRole: "STUDENT", status: "ACTIVE" });
    expect(body.student).toMatchObject({ id: F.studentProfileId, fullName: F.fullName });
    expect(res.body).not.toContain("passwordHash");
    expect(res.body).not.toContain(DEV_PASSWORD);
  });

  it("14. exposes a current-day ride with tracking left null", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/me/ride",
      remoteAddress: uniqueIp(),
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(200);
    const ride = res.json();

    expect(ride.assignment).toMatchObject({ id: F.assignmentId, status: "ACTIVE" });
    expect(ride.assignment.route).toMatchObject({ code: F.routeCode, name: F.routeName });
    expect(ride.assignment.pickupStop).toMatchObject({
      id: F.stopIds[1],
      name: "Dev Stop B (SYNTHETIC)",
    });
    expect(ride.assignment.dropStop).toMatchObject({ id: F.stopIds[2] });
    expect(ride.term).toMatchObject({ code: F.termCode });

    // Both directions exist for TODAY, and the service date is today's campus day.
    expect(ride.trips.inbound.tripId).toBe(devTripId(TripDirection.INBOUND, TODAY));
    expect(ride.trips.inbound.serviceDate).toBe(toServiceDateIso(TODAY));
    expect(ride.trips.inbound.direction).toBe("INBOUND");
    expect(ride.trips.return.tripId).toBe(devTripId(TripDirection.RETURN, TODAY));
    expect(ride.trips.return.serviceDate).toBe(toServiceDateIso(TODAY));

    expect(ride.trips.inbound.vehicle).toMatchObject({ plateNumber: F.plateNumber });
    expect(ride.trips.inbound.driver).toMatchObject({ fullName: F.driverFullName });
    // No driver phone number or licence number is ever serialized.
    expect(res.body).not.toContain(F.driverPhoneE164);
    expect(res.body).not.toContain(F.driverLicenseNumber);

    // No GPS feed exists, so tracking stays null rather than being invented.
    expect(ride.trips.inbound.tracking).toBeNull();
    expect(ride.trips.return.tracking).toBeNull();

    // The boarding event makes the journey status non-null on the current trip.
    expect(ride.journeyStatus).toBe("BOARDED");
    expect(ride.student).toMatchObject({
      studentProfileId: F.studentProfileId,
      studentNumber: F.studentNumber,
      enrollmentStatus: "ACTIVE",
    });
  });

  it("15. reports the day's ride in history through both contract paths", async () => {
    const trips = await app.inject({
      method: "GET",
      url: "/api/v1/me/trips",
      remoteAddress: uniqueIp(),
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(trips.statusCode).toBe(200);
    const body = trips.json();
    expect(body.page).toEqual({ nextCursor: null, hasMore: false });
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({
      tripId: devTripId(TripDirection.INBOUND, TODAY),
      serviceDate: toServiceDateIso(TODAY),
      direction: "INBOUND",
      routeCode: F.routeCode,
      plateNumber: F.plateNumber,
      pickupStopName: "Dev Stop B (SYNTHETIC)",
      outcome: "IN_PROGRESS", // boarded, not yet alighted
      delayMinutes: 0,
      alightedAt: null,
    });
    expect(body.data[0].boardedAt).toBeTruthy();

    // `/me/ride/history` is the same handler, so the canonical path agrees exactly.
    const alias = await app.inject({
      method: "GET",
      url: "/api/v1/me/ride/history",
      remoteAddress: uniqueIp(),
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(alias.statusCode).toBe(200);
    expect(alias.json().data).toEqual(body.data);
  });

  it("16. surfaces the synthetic notification as unread", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/me/notifications?limit=100",
      remoteAddress: uniqueIp(),
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(200);
    const item = res.json().data.find((n: { id: string }) => n.id === F.notificationId);
    expect(item).toBeDefined();
    expect(item.read).toBe(false);
    expect(item.type).toBe("INFO");
    expect(Object.keys(item.refs).sort()).toEqual(["routeId", "studentId", "tripId"]);
    expect(item.refs.studentId).toBe(F.studentProfileId);
  });

  it("17. is idempotent: re-running adds no rows and can rotate the password", async () => {
    const before = await snapshotTables();

    const again = await provisionDevStudent(app.prisma, { password: ROTATED_PASSWORD });
    expect(again.alreadyProvisioned).toBe(true);
    const third = await provisionDevStudent(app.prisma, { password: ROTATED_PASSWORD });
    expect(third.alreadyProvisioned).toBe(true);

    const after = await snapshotTables();
    expect(after.users).toEqual(before.users);
    expect(after.studentProfiles).toEqual(before.studentProfiles);
    expect(after.assignments).toEqual(before.assignments);
    expect(after.trips).toEqual(before.trips);
    expect(after.routes).toEqual(before.routes);
    expect(after.notifications).toEqual(before.notifications);
    expect(after.boardingEvents).toEqual(before.boardingEvents);
    expect(after.feeInvoices).toBe(before.feeInvoices);

    // The re-run re-hashed the password, so the new one works and the old one does not.
    const rotated = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      remoteAddress: uniqueIp(),
      payload: { identifier: F.email, password: ROTATED_PASSWORD },
    });
    expect(rotated.statusCode).toBe(200);

    const stale = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      remoteAddress: uniqueIp(),
      payload: { identifier: F.email, password: DEV_PASSWORD },
    });
    expect(stale.statusCode).toBe(401);

    // Restore the original password so the fixture is left in a known state.
    await provisionDevStudent(app.prisma, { password: DEV_PASSWORD });
  });

  it("18. never modifies an unrelated account or record", async () => {
    const unrelatedId = `${runId}-unrelated`;
    extraUserIds.push(unrelatedId);
    const created = await app.prisma.user.create({
      data: {
        id: unrelatedId,
        email: `unrelated-${runId}@viafast.test`,
        passwordHash: "$argon2id$v=19$m=19456,t=2,p=1$unrelated$unrelated",
        primaryRole: UserRole.STUDENT,
        status: "SUSPENDED",
      },
    });

    const before = await snapshotTables();
    await provisionDevStudent(app.prisma, { password: DEV_PASSWORD });
    const after = await snapshotTables();

    const untouched = await app.prisma.user.findUnique({ where: { id: unrelatedId } });
    expect(untouched).toEqual(created);

    // Nothing outside the `dev-` prefix was added anywhere.
    for (const key of [
      "users",
      "studentProfiles",
      "assignments",
      "trips",
      "routes",
      "notifications",
      "boardingEvents",
    ] as const) {
      expect(added(before[key], after[key]).every((id) => id.startsWith("dev-"))).toBe(true);
    }
  });

  it("19. documents the password source as an environment variable, not an argument", () => {
    expect(DEV_STUDENT_PASSWORD_ENV_VAR).toBe("VIAFAST_DEV_STUDENT_PASSWORD");
    expect(process.env[DEV_STUDENT_PASSWORD_ENV_VAR]).toBeUndefined();
    expect(DEV_PASSWORD.length).toBeGreaterThanOrEqual(MIN_DEV_PASSWORD_LENGTH);
  });
});
