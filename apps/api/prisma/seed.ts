// ─────────────────────────────────────────────────────────────────────────────
// ViaFast — SAFE DEVELOPMENT SEED (Phase 3: database foundation only)
//
// Run with:  npm run db:seed      (Prisma invokes `tsx prisma/seed.ts`)
//
// Guarantees:
//   • 100% SYNTHETIC data. Names/numbers/emails are fake; no real personal info.
//   • NO passwords or credentials are seeded (auth is out of scope — ADR-024).
//   • NO authoritative fee balances. Legacy fee data stays QUARANTINED (ADR-018);
//     the one invoice below is an isolated, clearly-marked dev fixture.
//   • IDEMPOTENT: every row is an upsert on a stable `seed-*` id with `update:{}`,
//     so re-running never creates duplicates and never mutates existing rows.
//   • Refuses to run when NODE_ENV=production.
// ─────────────────────────────────────────────────────────────────────────────
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  UserRole,
  UserStatus,
  EnrollmentStatus,
  DriverStatus,
  StaffPassType,
  VehicleType,
  VehicleStatus,
  RiderType,
  AssignmentStatus,
  TripDirection,
  TripStatus,
  BoardingEventType,
  BoardingSource,
  TrafficLevel,
  InvoiceStatus,
  InstallmentStatus,
  PaymentMethod,
  PaymentStatus,
  IncidentType,
  IncidentStatus,
  Severity,
  NotificationType,
  RequestStatus,
  AiVerdict,
} from "../generated/prisma/client";

if (process.env.NODE_ENV === "production") {
  throw new Error("Refusing to seed: NODE_ENV=production. This seed is for development only.");
}
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env and configure a DEV database.");
}

// Prisma 7's Rust-free client requires a driver adapter (verified empirically).
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ── Time helpers (store UTC; interpret wall-clock in Asia/Karachi — ADR-019) ──
const instant = (iso: string) => new Date(iso); // timestamptz
const day = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d)); // date
const clock = (h: number, mi: number) => new Date(Date.UTC(1970, 0, 1, h, mi, 0)); // time-of-day

async function main() {
  console.log("▶ Seeding ViaFast DEV database with SYNTHETIC data…");

  // ── Users (authentication principals). passwordHash intentionally NULL. ──
  const users = [
    { id: "seed-u-admin", email: "admin@viafast.test", role: UserRole.ADMIN },
    { id: "seed-u-driver-1", email: "driver.amir@viafast.test", role: UserRole.DRIVER },
    { id: "seed-u-driver-2", email: "driver.bilal@viafast.test", role: UserRole.DRIVER },
    { id: "seed-u-driver-3", email: "driver.sana@viafast.test", role: UserRole.DRIVER },
    { id: "seed-u-guardian-1", email: "guardian.mariam@viafast.test", role: UserRole.PARENT },
    { id: "seed-u-guardian-2", email: "guardian.imran@viafast.test", role: UserRole.PARENT },
    { id: "seed-u-student-1", email: "student.ayesha@viafast.test", role: UserRole.STUDENT },
    { id: "seed-u-student-2", email: "student.hassan@viafast.test", role: UserRole.STUDENT },
    { id: "seed-u-staff-1", email: "staff.nadia@viafast.test", role: UserRole.STAFF },
  ] as const;
  for (const u of users) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: {},
      create: { id: u.id, email: u.email, primaryRole: u.role, status: UserStatus.ACTIVE },
    });
  }

  // ── Term (ADR-017) ──
  await prisma.term.upsert({
    where: { id: "seed-term-spring-2026" },
    update: {},
    create: {
      id: "seed-term-spring-2026",
      code: "SPRING-2026",
      name: "Spring 2026",
      startDate: day(2026, 2, 16),
      endDate: day(2026, 6, 30),
    },
  });

  // ── Driver profiles (drv-3 ON_LEAVE and never assigned to a trip — invariant 6) ──
  const drivers = [
    { id: "seed-drv-1", userId: "seed-u-driver-1", fullName: "Amir Khan (DEV)", phone: "+923000000001", license: "HTV-DEV-0001", status: DriverStatus.ACTIVE, years: 8, rating: 4.6 },
    { id: "seed-drv-2", userId: "seed-u-driver-2", fullName: "Bilal Ahmed (DEV)", phone: "+923000000002", license: "HTV-DEV-0002", status: DriverStatus.ACTIVE, years: 5, rating: 4.2 },
    { id: "seed-drv-3", userId: "seed-u-driver-3", fullName: "Sana Tariq (DEV)", phone: "+923000000003", license: "HTV-DEV-0003", status: DriverStatus.ON_LEAVE, years: 3, rating: null },
  ] as const;
  for (const d of drivers) {
    await prisma.driverProfile.upsert({
      where: { id: d.id },
      update: {},
      create: {
        id: d.id, userId: d.userId, fullName: d.fullName, phoneE164: d.phone,
        licenseNumber: d.license, licenseClass: "HTV", employmentStatus: d.status,
        experienceYears: d.years, ratingAvg: d.rating ?? undefined,
      },
    });
  }

  // ── Student profiles (stu-3 has NO login → userId null) ──
  const students = [
    { id: "seed-stu-1", userId: "seed-u-student-1", num: "22F-DEV-001", name: "Ayesha Siddiqui (DEV)", dept: "Computer Science", status: EnrollmentStatus.ACTIVE },
    { id: "seed-stu-2", userId: "seed-u-student-2", num: "22F-DEV-002", name: "Hassan Raza (DEV)", dept: "Electrical Engineering", status: EnrollmentStatus.APPROVED },
    { id: "seed-stu-3", userId: null, num: "22F-DEV-003", name: "Fatima Noor (DEV)", dept: "Business Administration", status: EnrollmentStatus.PENDING },
  ] as const;
  for (const s of students) {
    await prisma.studentProfile.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id, userId: s.userId ?? undefined, studentNumber: s.num, fullName: s.name,
        department: s.dept, semester: "Spring 2026", enrollmentStatus: s.status,
      },
    });
  }

  // ── Guardian profiles ──
  const guardians = [
    { id: "seed-grn-1", userId: "seed-u-guardian-1", name: "Mariam Siddiqui (DEV)", phone: "+923000000011" },
    { id: "seed-grn-2", userId: "seed-u-guardian-2", name: "Imran Raza (DEV)", phone: "+923000000012" },
  ] as const;
  for (const g of guardians) {
    await prisma.guardianProfile.upsert({
      where: { id: g.id },
      update: {},
      create: { id: g.id, userId: g.userId, fullName: g.name, phoneE164: g.phone },
    });
  }

  // ── Staff profile (separate from students — ADR-022) ──
  await prisma.staffProfile.upsert({
    where: { id: "seed-stf-1" },
    update: {},
    create: {
      id: "seed-stf-1", userId: "seed-u-staff-1", staffNumber: "EMP-DEV-401",
      fullName: "Nadia Aslam (DEV)", department: "Faculty of Computing",
      passType: StaffPassType.TERM, validFrom: day(2026, 2, 16), validTo: day(2026, 6, 30),
    },
  });

  // ── Student↔Guardian links (M:N + tracking permission; one primary per student) ──
  const links = [
    { id: "seed-sg-1", studentId: "seed-stu-1", guardianId: "seed-grn-1", rel: "Mother", primary: true, canTrack: true },
    { id: "seed-sg-2", studentId: "seed-stu-2", guardianId: "seed-grn-2", rel: "Father", primary: true, canTrack: true },
    { id: "seed-sg-3", studentId: "seed-stu-2", guardianId: "seed-grn-1", rel: "Mother", primary: false, canTrack: true },
  ] as const;
  for (const l of links) {
    await prisma.studentGuardian.upsert({
      where: { id: l.id },
      update: {},
      create: { id: l.id, studentId: l.studentId, guardianId: l.guardianId, relationship: l.rel, isPrimary: l.primary, canTrack: l.canTrack },
    });
  }

  // ── Routes ──
  const routes = [
    { id: "seed-rt-1", code: "R1", name: "Cantt & Askari Express", color: "#06b6d4" },
    { id: "seed-rt-2", code: "R2", name: "Gulgasht City Loop", color: "#f59e0b" },
  ] as const;
  for (const r of routes) {
    await prisma.route.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, code: r.code, name: r.name, colorHex: r.color, isActive: true },
    });
  }

  // ── Ordered stops. RETURN times are monotonic in the REVERSED order (audit fix). ──
  const stops = [
    { id: "seed-st-r1-1", routeId: "seed-rt-1", seq: 1, name: "Cantt Gate", lat: 30.157, lng: 71.48, km: 0.0, in: [7, 0], ret: [17, 30] },
    { id: "seed-st-r1-2", routeId: "seed-rt-1", seq: 2, name: "Askari Chowk", lat: 30.172, lng: 71.491, km: 3.2, in: [7, 12], ret: [17, 18] },
    { id: "seed-st-r1-3", routeId: "seed-rt-1", seq: 3, name: "Abdali Road", lat: 30.19, lng: 71.501, km: 6.5, in: [7, 25], ret: [17, 5] },
    { id: "seed-st-r1-4", routeId: "seed-rt-1", seq: 4, name: "Campus Main Gate", lat: 30.249, lng: 71.533, km: 12.8, in: [7, 45], ret: [16, 50] },
    { id: "seed-st-r2-1", routeId: "seed-rt-2", seq: 1, name: "Gulgasht Colony", lat: 30.21, lng: 71.47, km: 0.0, in: [7, 5], ret: [17, 25] },
    { id: "seed-st-r2-2", routeId: "seed-rt-2", seq: 2, name: "Model Town", lat: 30.225, lng: 71.49, km: 4.1, in: [7, 18], ret: [17, 12] },
    { id: "seed-st-r2-3", routeId: "seed-rt-2", seq: 3, name: "Campus Main Gate", lat: 30.249, lng: 71.533, km: 9.7, in: [7, 40], ret: [16, 58] },
  ] as const;
  for (const s of stops) {
    await prisma.routeStop.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id, routeId: s.routeId, sequence: s.seq, name: s.name,
        latitude: s.lat, longitude: s.lng, distanceFromOriginKm: s.km,
        scheduledInboundTime: clock(s.in[0], s.in[1]),
        scheduledReturnTime: clock(s.ret[0], s.ret[1]),
      },
    });
  }

  // ── Vehicles ──
  const vehicles = [
    { id: "seed-veh-1", plate: "Coaster # DEV-1987", type: VehicleType.COASTER, seats: 30, status: VehicleStatus.IN_SERVICE },
    { id: "seed-veh-2", plate: "Bus # DEV-9757", type: VehicleType.BUS, seats: 40, status: VehicleStatus.IN_SERVICE },
    { id: "seed-veh-3", plate: "Coaster # DEV-2001", type: VehicleType.COASTER, seats: 30, status: VehicleStatus.MAINTENANCE },
  ] as const;
  for (const v of vehicles) {
    await prisma.vehicle.upsert({
      where: { id: v.id },
      update: {},
      create: { id: v.id, plateNumber: v.plate, vehicleType: v.type, seatCapacity: v.seats, model: "DEV", status: v.status },
    });
  }

  // ── Ride assignments (polymorphic rider; pickup.seq < drop.seq; one ACTIVE per student/term) ──
  const assignments = [
    { id: "seed-asg-1", riderType: RiderType.STUDENT, studentId: "seed-stu-1", staffProfileId: null, routeId: "seed-rt-1", pickup: "seed-st-r1-1", drop: "seed-st-r1-4", status: AssignmentStatus.ACTIVE },
    { id: "seed-asg-2", riderType: RiderType.STUDENT, studentId: "seed-stu-2", staffProfileId: null, routeId: "seed-rt-1", pickup: "seed-st-r1-2", drop: "seed-st-r1-4", status: AssignmentStatus.ACTIVE },
    { id: "seed-asg-3", riderType: RiderType.STAFF, studentId: null, staffProfileId: "seed-stf-1", routeId: "seed-rt-1", pickup: "seed-st-r1-3", drop: "seed-st-r1-4", status: AssignmentStatus.ACTIVE },
    { id: "seed-asg-4", riderType: RiderType.STUDENT, studentId: "seed-stu-1", staffProfileId: null, routeId: "seed-rt-2", pickup: "seed-st-r2-1", drop: "seed-st-r2-3", status: AssignmentStatus.ENDED },
  ] as const;
  for (const a of assignments) {
    await prisma.rideAssignment.upsert({
      where: { id: a.id },
      update: {},
      create: {
        id: a.id, riderType: a.riderType,
        studentId: a.studentId ?? undefined, staffProfileId: a.staffProfileId ?? undefined,
        routeId: a.routeId, pickupStopId: a.pickup, dropStopId: a.drop,
        termId: "seed-term-spring-2026", status: a.status,
        effectiveFrom: day(2026, 2, 16),
        effectiveTo: a.status === AssignmentStatus.ENDED ? day(2026, 3, 1) : undefined,
      },
    });
  }

  // ── Trips (route × serviceDate × direction unique; representative statuses) ──
  const trips = [
    { id: "seed-trip-r1-in-20260302", routeId: "seed-rt-1", dir: TripDirection.INBOUND, veh: "seed-veh-1", drv: "seed-drv-1", status: TripStatus.IN_PROGRESS, dep: "2026-03-02T02:00:00Z", arr: "2026-03-02T02:45:00Z", actDep: "2026-03-02T02:03:00Z", actArr: null, delay: 3, curSeq: 2 },
    { id: "seed-trip-r1-ret-20260302", routeId: "seed-rt-1", dir: TripDirection.RETURN, veh: "seed-veh-1", drv: "seed-drv-1", status: TripStatus.SCHEDULED, dep: "2026-03-02T11:50:00Z", arr: "2026-03-02T12:30:00Z", actDep: null, actArr: null, delay: 0, curSeq: null },
    { id: "seed-trip-r2-in-20260302", routeId: "seed-rt-2", dir: TripDirection.INBOUND, veh: "seed-veh-2", drv: "seed-drv-2", status: TripStatus.COMPLETED, dep: "2026-03-02T02:05:00Z", arr: "2026-03-02T02:40:00Z", actDep: "2026-03-02T02:05:00Z", actArr: "2026-03-02T02:38:00Z", delay: 0, curSeq: 3 },
  ] as const;
  for (const t of trips) {
    await prisma.trip.upsert({
      where: { id: t.id },
      update: {},
      create: {
        id: t.id, routeId: t.routeId, serviceDate: day(2026, 3, 2), direction: t.dir,
        vehicleId: t.veh, driverId: t.drv, status: t.status,
        scheduledDepartureAt: instant(t.dep), scheduledArrivalAt: instant(t.arr),
        actualDepartureAt: t.actDep ? instant(t.actDep) : undefined,
        actualArrivalAt: t.actArr ? instant(t.actArr) : undefined,
        delayMinutes: t.delay, currentStopSequence: t.curSeq ?? undefined,
      },
    });
  }

  // ── Boarding events (append-only journey log for the IN_PROGRESS trip) ──
  const boardings = [
    { id: "seed-be-1", tripId: "seed-trip-r1-in-20260302", riderType: RiderType.STUDENT, studentId: "seed-stu-1", staffProfileId: null, stopId: "seed-st-r1-1", event: BoardingEventType.WAITING, source: BoardingSource.SYSTEM, by: null, at: "2026-03-02T01:58:00Z" },
    { id: "seed-be-2", tripId: "seed-trip-r1-in-20260302", riderType: RiderType.STUDENT, studentId: "seed-stu-1", staffProfileId: null, stopId: "seed-st-r1-1", event: BoardingEventType.BOARDED, source: BoardingSource.DRIVER, by: "seed-u-driver-1", at: "2026-03-02T02:04:00Z" },
    { id: "seed-be-3", tripId: "seed-trip-r1-in-20260302", riderType: RiderType.STUDENT, studentId: "seed-stu-2", staffProfileId: null, stopId: "seed-st-r1-2", event: BoardingEventType.BOARDED, source: BoardingSource.DRIVER, by: "seed-u-driver-1", at: "2026-03-02T02:15:00Z" },
    { id: "seed-be-4", tripId: "seed-trip-r1-in-20260302", riderType: RiderType.STAFF, studentId: null, staffProfileId: "seed-stf-1", stopId: "seed-st-r1-3", event: BoardingEventType.WAITING, source: BoardingSource.SYSTEM, by: null, at: "2026-03-02T02:20:00Z" },
  ] as const;
  for (const b of boardings) {
    await prisma.boardingEvent.upsert({
      where: { id: b.id },
      update: {},
      create: {
        id: b.id, tripId: b.tripId, riderType: b.riderType,
        studentId: b.studentId ?? undefined, staffProfileId: b.staffProfileId ?? undefined,
        stopId: b.stopId, event: b.event, source: b.source,
        recordedByUserId: b.by ?? undefined, occurredAt: instant(b.at),
      },
    });
  }

  // ── Location updates (append-only GPS fixes; provider-agnostic — ADR-001) ──
  const fixes = [
    { id: "seed-lu-1", veh: "seed-veh-1", trip: "seed-trip-r1-in-20260302", seq: 1, lat: 30.157, lng: 71.48, speed: 0, at: "2026-03-02T02:00:00Z" },
    { id: "seed-lu-2", veh: "seed-veh-1", trip: "seed-trip-r1-in-20260302", seq: 2, lat: 30.172, lng: 71.491, speed: 38, at: "2026-03-02T02:10:00Z" },
  ] as const;
  for (const f of fixes) {
    await prisma.locationUpdate.upsert({
      where: { id: f.id },
      update: {},
      create: {
        id: f.id, vehicleId: f.veh, tripId: f.trip, seq: BigInt(f.seq),
        latitude: f.lat, longitude: f.lng, speedKmh: f.speed, provider: "SIMULATED",
        deviceRecordedAt: instant(f.at), serverReceivedAt: instant(f.at),
      },
    });
  }

  // ── ETA cache (a projection, NEVER authoritative — ADR-007) ──
  await prisma.etaEstimate.upsert({
    where: { id: "seed-eta-1" },
    update: {},
    create: {
      id: "seed-eta-1", tripId: "seed-trip-r1-in-20260302", targetStopId: "seed-st-r1-4",
      etaMinutes: 22, confidencePercent: 84, distanceRemainingKm: 9.6,
      trafficLevel: TrafficLevel.MODERATE, algorithmVersion: "sim-eta-v1",
      computedAt: instant("2026-03-02T02:10:05Z"),
    },
  });

  // ── Incident ──
  await prisma.incident.upsert({
    where: { id: "seed-inc-1" },
    update: {},
    create: {
      id: "seed-inc-1", tripId: "seed-trip-r1-in-20260302", vehicleId: "seed-veh-1", driverId: "seed-drv-1",
      reportedByUserId: "seed-u-driver-1", type: IncidentType.TRAFFIC, severity: Severity.LOW,
      message: "DEV fixture: slow traffic near Askari Chowk.", latitude: 30.172, longitude: 71.491,
      status: IncidentStatus.OPEN,
    },
  });

  // ── Notifications (in-app only — ADR-025) + per-user read state ──
  await prisma.notification.upsert({
    where: { id: "seed-not-1" },
    update: {},
    create: {
      id: "seed-not-1", type: NotificationType.DELAY, severity: Severity.LOW,
      title: "Route R1 running ~3 min late", body: "DEV fixture: minor delay on the inbound R1 service.",
      audienceRole: UserRole.PARENT, tripId: "seed-trip-r1-in-20260302", routeId: "seed-rt-1",
    },
  });
  await prisma.notification.upsert({
    where: { id: "seed-not-2" },
    update: {},
    create: {
      id: "seed-not-2", type: NotificationType.INFO, severity: Severity.LOW,
      title: "Welcome to ViaFast (dev seed)", body: "DEV fixture notification. No real data.",
    },
  });
  await prisma.notificationRead.upsert({
    where: { id: "seed-nr-1" },
    update: {},
    create: { id: "seed-nr-1", notificationId: "seed-not-1", userId: "seed-u-guardian-1", readAt: instant("2026-03-02T02:20:00Z") },
  });

  // ── Route-change request (demonstrates ADR-023 statuses; AI is decision-support) ──
  await prisma.routeChangeRequest.upsert({
    where: { id: "seed-rcr-1" },
    update: {},
    create: {
      id: "seed-rcr-1", studentId: "seed-stu-2", currentAssignmentId: "seed-asg-2",
      requestedRouteId: "seed-rt-2", requestedStopId: "seed-st-r2-2",
      reason: "DEV fixture: closer stop requested.", status: RequestStatus.AI_REVIEWED,
      aiRecommendation: AiVerdict.REVIEW_REQUIRED, aiReason: "DEV fixture: capacity check pending.",
    },
  });

  // ── Audit events (append-only; crew/vehicle swaps are audit rows — ADR-004) ──
  const audits = [
    { id: "seed-aud-1", actor: "seed-u-admin", action: "TRIP_ASSIGN_VEHICLE", entityType: "Trip", entityId: "seed-trip-r1-in-20260302", before: { vehicleId: null }, after: { vehicleId: "seed-veh-1" }, requestId: "seed-req-1" },
    { id: "seed-aud-2", actor: "seed-u-driver-1", action: "BOARDING_RECORD", entityType: "BoardingEvent", entityId: "seed-be-2", before: null, after: { event: "BOARDED" }, requestId: "seed-req-2" },
  ] as const;
  for (const a of audits) {
    await prisma.auditEvent.upsert({
      where: { id: a.id },
      update: {},
      create: {
        id: a.id, actorUserId: a.actor, action: a.action, entityType: a.entityType, entityId: a.entityId,
        beforeJson: a.before ?? undefined, afterJson: a.after ?? undefined, requestId: a.requestId,
      },
    });
  }

  // ── Financial fixture: SYNTHETIC + ISOLATED + NON-AUTHORITATIVE (ADR-018) ──
  // Legacy fee balances are QUARANTINED and NOT imported. The amounts below are
  // invented dev placeholders and must never be treated as a real balance.
  // Invariant demonstrated: SUM(installments) == invoice total (500 + 500 = 1000).
  await prisma.feeInvoice.upsert({
    where: { id: "seed-inv-1" },
    update: {},
    create: {
      id: "seed-inv-1", studentId: "seed-stu-1", termId: "seed-term-spring-2026",
      totalAmountPkr: "1000.00", currency: "PKR", status: InvoiceStatus.UNPAID,
    },
  });
  const installments = [
    { id: "seed-inst-1", invoiceId: "seed-inv-1", number: 1, label: "DEV fixture installment 1", amount: "500.00", due: day(2026, 3, 10) },
    { id: "seed-inst-2", invoiceId: "seed-inv-1", number: 2, label: "DEV fixture installment 2", amount: "500.00", due: day(2026, 4, 10) },
  ] as const;
  for (const i of installments) {
    await prisma.installment.upsert({
      where: { id: i.id },
      update: {},
      create: { id: i.id, invoiceId: i.invoiceId, number: i.number, label: i.label, amountPkr: i.amount, dueDate: i.due, status: InstallmentStatus.PENDING },
    });
  }
  await prisma.payment.upsert({
    where: { id: "seed-pay-1" },
    update: {},
    create: {
      id: "seed-pay-1", invoiceId: "seed-inv-1", installmentId: "seed-inst-1",
      amountPkr: "500.00", method: PaymentMethod.BANK_TRANSFER, status: PaymentStatus.PENDING,
      reference: "DEV-RECEIPT-0001",
    },
  });

  console.log("✔ Seed complete (synthetic dev data).");
  console.log("  Terms:1 Users:%d Routes:%d Stops:%d Vehicles:%d Drivers:%d Students:%d Guardians:%d Staff:%d Assignments:%d Trips:%d",
    users.length, routes.length, stops.length, vehicles.length, drivers.length, students.length, guardians.length, 1, assignments.length, trips.length);
}

main()
  .catch((e) => {
    console.error("✖ Seed failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
