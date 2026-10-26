// ─────────────────────────────────────────────────────────────────────────────
// DEVELOPMENT-ONLY synthetic Student fixture (ADR‑026 follow-up risk 6).
//
// WHY THIS EXISTS. `prisma/seed.ts` deliberately leaves every `passwordHash`
// NULL (ADR‑024: Phase 3 was schema support only) and dates its trips
// 2026‑03‑02, so no seeded account can log in and `GET /me/ride` returns nulls
// for today. That makes the Student API impossible to exercise by hand. This
// module provisions ONE clearly-designated synthetic Student that can
// authenticate through the real login flow and has a ride on the CURRENT campus
// service date.
//
// WHY A SEPARATE MODULE FROM THE SEED. Credentials must not be coupled to the
// whole dataset: `db:seed` stays credential-free, and this fixture stays small.
//
// SAFETY GUARANTEES
//   • Refuses to run when NODE_ENV=production, or when DATABASE_URL does not
//     name a dev/test/local database (same rule as scripts/provision-dev-user.ts).
//   • Owns exactly the rows whose ids start with `dev-`. It never updates, and
//     can never select, any other row — every write is keyed by one of those ids.
//   • Aborts rather than hijack: if the fixture email or student number is
//     already held by a DIFFERENT account, that is a real conflict and it throws.
//   • Stores only an Argon2id hash from the same `hashPassword` the API verifies
//     against. The plaintext password is never persisted, returned, or logged,
//     and no reusable default password exists anywhere in this module.
//   • Creates no fee invoice, installment or payment: no authoritative balance is
//     fabricated (ADR‑018).
//   • `tracking` stays null and no vehicle position is invented (ADR‑001/007/009).
//   • Idempotent: re-running never duplicates a row. Trips are keyed by service
//     date, so each day adds that day's run and earlier ones become history.
//
// Rows this module owns may be UPDATED on re-run (that is what makes it
// self-healing — a changed password takes effect, a closed assignment reopens).
// Rows it does not own are never touched.
// ─────────────────────────────────────────────────────────────────────────────
import type { PrismaClient } from "../../generated/prisma/client";
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
  VehicleStatus,
  VehicleType,
} from "../../generated/prisma/client";
import { campusServiceDate, toServiceDateIso } from "../common/time";
import { hashPassword, MAX_PASSWORD_LENGTH } from "../security/password";

/** Environment variable the CLI reads the local development password from. */
export const DEV_STUDENT_PASSWORD_ENV_VAR = "VIAFAST_DEV_STUDENT_PASSWORD";
export const MIN_DEV_PASSWORD_LENGTH = 8;

/**
 * Every stable id and business key this fixture owns. All ids share the `dev-`
 * prefix so the fixture is trivially identifiable in the database and can be
 * cleaned up without touching `seed-*` rows or anything a developer created.
 */
export const DEV_STUDENT_FIXTURE = {
  userId: "dev-u-student",
  studentProfileId: "dev-sp-student",
  termId: "dev-term",
  routeId: "dev-rt",
  stopIds: ["dev-st-1", "dev-st-2", "dev-st-3"],
  vehicleId: "dev-veh",
  driverProfileId: "dev-drv",
  assignmentId: "dev-asg",
  notificationId: "dev-not-1",
  email: "dev.student@viafast.test",
  studentNumber: "DEV-STU-0001",
  fullName: "Dev Student (SYNTHETIC)",
  department: "Computer Science",
  semester: "Dev Term",
  termCode: "DEV-TERM",
  termName: "Dev Term (SYNTHETIC)",
  routeCode: "DEV-R1",
  routeName: "Dev Corridor (SYNTHETIC)",
  routeColorHex: "#7C3AED",
  plateNumber: "DEV-SYNTH-0001",
  driverFullName: "Dev Driver (SYNTHETIC)",
  driverLicenseNumber: "DEV-SYNTH-LIC-0001",
  driverPhoneE164: "+923009999999",
} as const;

/** Trip/boarding-event ids encode the service date, so each day is its own row. */
export function devTripId(direction: TripDirection, serviceDate: Date): string {
  const day = toServiceDateIso(serviceDate).replaceAll("-", "");
  return `dev-trip-${direction === TripDirection.INBOUND ? "in" : "ret"}-${day}`;
}

export function devBoardingEventId(serviceDate: Date): string {
  return `dev-be-in-${toServiceDateIso(serviceDate).replaceAll("-", "")}`;
}

// ══════════════════════════ TARGET-SAFETY GUARD ══════════════════════════════

export type DevTargetCheck =
  | { safe: true; databaseName: string }
  | { safe: false; reason: string };

/** Mirrors scripts/provision-dev-user.ts: reject production and non-dev targets. */
const DEV_DATABASE_NAME_RE = /dev|test|local/i;

export function checkDevTarget(
  nodeEnv: string | undefined,
  databaseUrl: string | undefined,
): DevTargetCheck {
  if (nodeEnv === "production") {
    return { safe: false, reason: "NODE_ENV=production. This fixture is for development only." };
  }
  if (!databaseUrl) {
    return {
      safe: false,
      reason: `DATABASE_URL is not set. Copy .env.example to .env and configure a DEV database.`,
    };
  }
  let databaseName = "";
  try {
    databaseName = new URL(databaseUrl).pathname.replace(/^\//, "");
  } catch {
    databaseName = "";
  }
  if (!DEV_DATABASE_NAME_RE.test(databaseName)) {
    return {
      safe: false,
      reason:
        `DATABASE_URL points at "${databaseName || "<unknown>"}", which cannot be safely ` +
        `identified as a dev/test/local database.`,
    };
  }
  return { safe: true, databaseName };
}

// ══════════════════════════════ PROVISIONING ═════════════════════════════════

export interface ProvisionDevStudentOptions {
  /** Plaintext local-development password. Hashed here; never stored or returned. */
  password: string;
  /** Overrides for tests. Default to the process environment. */
  nodeEnv?: string;
  databaseUrl?: string;
  /** Campus service date to build the ride for. Defaults to today (Asia/Karachi). */
  serviceDate?: Date;
}

export interface DevStudentProvisionSummary {
  userId: string;
  studentProfileId: string;
  email: string;
  studentNumber: string;
  role: UserRole;
  termId: string;
  routeId: string;
  routeCode: string;
  assignmentId: string;
  vehicleId: string;
  driverProfileId: string;
  serviceDate: string;
  inboundTripId: string;
  returnTripId: string;
  notificationId: string;
  /** True when the fixture user already existed (its password was re-set). */
  alreadyProvisioned: boolean;
}

const DAY_MS = 86_400_000;

/** A `@db.Time` value: the UTC epoch anchored at a wall-clock time (Asia/Karachi). */
const clock = (hours: number, minutes: number): Date =>
  new Date(Date.UTC(1970, 0, 1, hours, minutes, 0));

/**
 * Create or refresh the synthetic development Student and the minimum records a
 * current ride needs: term, corridor, three ordered stops, vehicle, driver,
 * ACTIVE assignment, today's inbound + return trips, one boarding event (so
 * history and `journeyStatus` are non-empty) and one personally-addressed
 * notification.
 *
 * Deliberately absent: any fee invoice, installment or payment (ADR‑018), any
 * `LocationUpdate` or `EtaEstimate` (ADR‑007 — position and ETA are derived
 * subsystems that do not exist yet, and inventing them would make `tracking`
 * look live when it is not).
 */
export async function provisionDevStudent(
  prisma: PrismaClient,
  options: ProvisionDevStudentOptions,
): Promise<DevStudentProvisionSummary> {
  const check = checkDevTarget(
    options.nodeEnv ?? process.env.NODE_ENV,
    options.databaseUrl ?? process.env.DATABASE_URL,
  );
  if (!check.safe) {
    throw new Error(`Refusing to provision the dev Student fixture: ${check.reason}`);
  }

  const { password } = options;
  if (password.length < MIN_DEV_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    throw new Error(
      `The development password must be between ${MIN_DEV_PASSWORD_LENGTH} and ` +
        `${MAX_PASSWORD_LENGTH} characters.`,
    );
  }

  const F = DEV_STUDENT_FIXTURE;
  const serviceDate = options.serviceDate ?? campusServiceDate();

  // ── Conflict guard: never take over an account this fixture does not own ──
  const emailOwner = await prisma.user.findUnique({
    where: { email: F.email },
    select: { id: true },
  });
  if (emailOwner !== null && emailOwner.id !== F.userId) {
    throw new Error(
      `Email "${F.email}" already belongs to a different account. This tool never ` +
        `overwrites an account it does not own; remove that row or change the fixture email.`,
    );
  }
  const numberOwner = await prisma.studentProfile.findUnique({
    where: { studentNumber: F.studentNumber },
    select: { id: true },
  });
  if (numberOwner !== null && numberOwner.id !== F.studentProfileId) {
    throw new Error(
      `Student number "${F.studentNumber}" already belongs to a different profile. ` +
        `This tool never overwrites a record it does not own.`,
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: { id: F.userId },
    select: { id: true },
  });
  const passwordHash = await hashPassword(password);

  // ── 1. Authentication principal (STUDENT role, ACTIVE so login succeeds) ──
  // `phoneE164` is left NULL: it is UNIQUE and the fixture does not need it.
  // The password hash IS refreshed on re-run — that is the point of the tool.
  await prisma.user.upsert({
    where: { id: F.userId },
    update: {
      passwordHash,
      primaryRole: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
    },
    create: {
      id: F.userId,
      email: F.email,
      passwordHash,
      primaryRole: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
    },
  });

  // ── 2. Student profile (the UNIQUE 1:1 link the API resolves identity from) ──
  // Re-linked and re-activated on re-run so the fixture self-heals if the user
  // row was deleted (the FK is onDelete: SetNull).
  await prisma.studentProfile.upsert({
    where: { id: F.studentProfileId },
    update: { userId: F.userId, enrollmentStatus: EnrollmentStatus.ACTIVE },
    create: {
      id: F.studentProfileId,
      userId: F.userId,
      studentNumber: F.studentNumber,
      fullName: F.fullName,
      department: F.department,
      semester: F.semester,
      enrollmentStatus: EnrollmentStatus.ACTIVE,
    },
  });

  // ── 3. Term (ADR‑017). Window is relative to today and generous; the ride
  // query filters on the ASSIGNMENT's effective window, not these dates, so an
  // old term never breaks the fixture — it only affects what /me/ride displays.
  await prisma.term.upsert({
    where: { id: F.termId },
    update: {},
    create: {
      id: F.termId,
      code: F.termCode,
      name: F.termName,
      startDate: new Date(serviceDate.getTime() - 30 * DAY_MS),
      endDate: new Date(serviceDate.getTime() + 180 * DAY_MS),
    },
  });

  // ── 4. Corridor + ordered stops (INBOUND order; RETURN is the reverse, so the
  // return times run backwards through the sequence — domain-model §3.3).
  // Coordinates are 0/0 ON PURPOSE: this is a synthetic corridor that was never
  // surveyed, and a plausible-looking real coordinate would be a fabricated
  // real-world position. `tracking` stays null regardless (ADR‑001/007).
  await prisma.route.upsert({
    where: { id: F.routeId },
    update: {},
    create: {
      id: F.routeId,
      code: F.routeCode,
      name: F.routeName,
      colorHex: F.routeColorHex,
      isActive: true,
    },
  });

  const stops = [
    { id: F.stopIds[0]!, sequence: 1, name: "Dev Stop A (SYNTHETIC)", km: 0, in: [7, 0], ret: [17, 30] },
    { id: F.stopIds[1]!, sequence: 2, name: "Dev Stop B (SYNTHETIC)", km: 1, in: [7, 20], ret: [17, 10] },
    { id: F.stopIds[2]!, sequence: 3, name: "Campus Main Gate (DEV)", km: 2, in: [7, 45], ret: [16, 50] },
  ] as const;
  for (const stop of stops) {
    await prisma.routeStop.upsert({
      where: { id: stop.id },
      update: {},
      create: {
        id: stop.id,
        routeId: F.routeId,
        sequence: stop.sequence,
        name: stop.name,
        latitude: 0,
        longitude: 0,
        distanceFromOriginKm: stop.km,
        scheduledInboundTime: clock(stop.in[0], stop.in[1]),
        scheduledReturnTime: clock(stop.ret[0], stop.ret[1]),
      },
    });
  }

  // ── 5. Vehicle + driver. `ratingAvg` stays null rather than inventing a score,
  // and the driver gets no User row (userId is optional) so no second credential
  // is created. Driver phone/licence are never exposed by the Student API.
  await prisma.vehicle.upsert({
    where: { id: F.vehicleId },
    update: {},
    create: {
      id: F.vehicleId,
      plateNumber: F.plateNumber,
      vehicleType: VehicleType.COASTER,
      seatCapacity: 22,
      model: "SYNTHETIC",
      status: VehicleStatus.IN_SERVICE,
    },
  });

  await prisma.driverProfile.upsert({
    where: { id: F.driverProfileId },
    update: {},
    create: {
      id: F.driverProfileId,
      fullName: F.driverFullName,
      phoneE164: F.driverPhoneE164,
      licenseNumber: F.driverLicenseNumber,
      licenseClass: "HTV",
      employmentStatus: DriverStatus.ACTIVE,
    },
  });

  // ── 6. ACTIVE assignment, open-ended so it is still current on any later run.
  // Satisfies both DB invariants: the rider-XOR CHECK (STUDENT + studentId set +
  // staffProfileId null) and the partial unique index on
  // (student_id, term_id) WHERE status='ACTIVE' AND effective_to IS NULL — this
  // is the only row for that pair. pickup.sequence (2) < drop.sequence (3).
  await prisma.rideAssignment.upsert({
    where: { id: F.assignmentId },
    update: {
      status: AssignmentStatus.ACTIVE,
      effectiveTo: null,
      deletedAt: null,
    },
    create: {
      id: F.assignmentId,
      riderType: RiderType.STUDENT,
      studentId: F.studentProfileId,
      routeId: F.routeId,
      pickupStopId: F.stopIds[1]!,
      dropStopId: F.stopIds[2]!,
      termId: F.termId,
      status: AssignmentStatus.ACTIVE,
      effectiveFrom: new Date(serviceDate.getTime() - 30 * DAY_MS),
      effectiveTo: null,
    },
  });

  // ── 7. Today's two runs. `@@unique([routeId, serviceDate, direction])` means
  // at most one row per direction per day, and the date-stamped id makes the
  // upsert a no-op on a same-day re-run while a new day adds a new pair.
  // Schedule shape mirrors the seeded corridor: 07:00/07:45 and 16:50/17:30
  // Asia/Karachi (UTC+5, no DST — ADR‑019), stored as UTC instants.
  const atUtc = (hours: number, minutes: number): Date =>
    new Date(serviceDate.getTime() + (hours * 60 + minutes) * 60_000);

  const inboundTripId = devTripId(TripDirection.INBOUND, serviceDate);
  const returnTripId = devTripId(TripDirection.RETURN, serviceDate);

  await prisma.trip.upsert({
    where: { id: inboundTripId },
    update: {},
    create: {
      id: inboundTripId,
      routeId: F.routeId,
      serviceDate,
      direction: TripDirection.INBOUND,
      vehicleId: F.vehicleId,
      driverId: F.driverProfileId,
      status: TripStatus.IN_PROGRESS,
      scheduledDepartureAt: atUtc(2, 0),
      scheduledArrivalAt: atUtc(2, 45),
      delayMinutes: 0,
    },
  });

  await prisma.trip.upsert({
    where: { id: returnTripId },
    update: {},
    create: {
      id: returnTripId,
      routeId: F.routeId,
      serviceDate,
      direction: TripDirection.RETURN,
      vehicleId: F.vehicleId,
      driverId: F.driverProfileId,
      status: TripStatus.SCHEDULED,
      scheduledDepartureAt: atUtc(11, 50),
      scheduledArrivalAt: atUtc(12, 30),
      delayMinutes: 0,
    },
  });

  // ── 8. One boarding event on the inbound run. This is what makes the fixture
  // useful: history is scoped to trips the rider has a BoardingEvent on, and
  // `journeyStatus` is the latest event for the current trip. Without it both
  // would be empty. Append-only, so never updated.
  await prisma.boardingEvent.upsert({
    where: { id: devBoardingEventId(serviceDate) },
    update: {},
    create: {
      id: devBoardingEventId(serviceDate),
      tripId: inboundTripId,
      riderType: RiderType.STUDENT,
      studentId: F.studentProfileId,
      stopId: F.stopIds[1]!,
      event: BoardingEventType.BOARDED,
      // SYSTEM, not DRIVER: no driver recorded this, and the fixture must not
      // imply a crew action that never happened.
      source: BoardingSource.SYSTEM,
      occurredAt: atUtc(2, 5),
    },
  });

  // ── 9. One notification, personally addressed (studentId = this profile).
  // The ownership gate in `notificationVisibilityWhere` keeps it invisible to
  // every other student, so it cannot leak into another fixture's assertions.
  // audienceRole stays null; no untargeted broadcast is created on purpose.
  await prisma.notification.upsert({
    where: { id: F.notificationId },
    update: {},
    create: {
      id: F.notificationId,
      type: NotificationType.INFO,
      severity: Severity.LOW,
      title: "Dev fixture: your synthetic ride is ready",
      body:
        "SYNTHETIC notification created by provision:dev-student for local development. " +
        "Not real service data.",
      audienceRole: null,
      studentId: F.studentProfileId,
      routeId: F.routeId,
    },
  });

  return {
    userId: F.userId,
    studentProfileId: F.studentProfileId,
    email: F.email,
    studentNumber: F.studentNumber,
    role: UserRole.STUDENT,
    termId: F.termId,
    routeId: F.routeId,
    routeCode: F.routeCode,
    assignmentId: F.assignmentId,
    vehicleId: F.vehicleId,
    driverProfileId: F.driverProfileId,
    serviceDate: toServiceDateIso(serviceDate),
    inboundTripId,
    returnTripId,
    notificationId: F.notificationId,
    alreadyProvisioned: existingUser !== null,
  };
}
