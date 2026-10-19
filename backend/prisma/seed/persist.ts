// Idempotent persistence of the SeedPlan into PostgreSQL. Every write is
// keyed on a natural/business key (upsert) or a deterministic findFirst
// lookup, so `npm run db:seed` is safe to re-run: rows are created once and
// converged to the plan on later runs — never duplicated, never wiped.
//
// Models without a schema-level natural unique (Stop, TransportAssignment,
// Trip, FeeDefinition, Invoice, Payment) use findFirst-then-create with
// deterministic predicates; the Phase 4A schema is not modified to
// accommodate the seed.
//
// Placeholder identities: the source data carries no emails, but User.email
// is the only user-level unique column. The seed therefore assigns clearly
// non-production placeholder emails (<slug>@seed.viafast.example — RFC 2606
// reserved TLD) that double as the deterministic upsert key. Authentication
// (a later phase) replaces them with real identities.
//
// Staff riders receive UserRole.STUDENT: the 4A role enum has no STAFF member
// (UserRole is the platform access role), and the student/staff distinction
// lives in StudentProfile.riderType.

import { Prisma, PrismaClient, UserStatus, UserRole } from '@prisma/client';
import {
  GuardianPlan,
  GuardianshipPlan,
  RiderPlan,
  SeedPlan,
  StopKey,
  TripPlan,
} from './transform';

/** Marks seeded rows as demo fixtures; doubles as the payment idempotency key. */
export const DEMO_PAYMENT_REFERENCE = 'viafast-seed-demo-payment';

const SEED_EMAIL_DOMAIN = 'seed.viafast.example';

type Tx = Prisma.TransactionClient;

function slugOf(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9.-]+/g, '-');
}

function seedEmail(prefix: string, key: string): string {
  return `${prefix}${slugOf(key)}@${SEED_EMAIL_DOMAIN}`;
}

function minutesOfUtcDay(date: Date): number {
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

function requireMapped<T>(map: Map<string, T>, key: string, what: string): T {
  const value = map.get(key);
  if (value === undefined) {
    throw new Error(`Seed integrity failure: ${what} ("${key}") was not persisted earlier`);
  }
  return value;
}

function routeDirectionKey(routeCode: string, direction: string): string {
  return `${routeCode}|${direction}`;
}

export async function persistSeedPlan(prisma: PrismaClient, plan: SeedPlan): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
      const riderIdByRoll = await persistRiders(tx, plan.riders);
      await persistGuardians(tx, plan.guardians, plan.guardianships, riderIdByRoll);
      const driverIdByLicense = await persistDrivers(tx, plan.drivers);
      const vehicleIdByRegistration = await persistVehicles(tx, plan.vehicles);
      const stopIdByKey = await persistStops(tx, plan.stops);
      const routeIdByCode = await persistRoutes(tx, plan.routes);
      const routeStopIdByRouteStop = await persistRouteStops(
        tx,
        plan.routeStops,
        routeIdByCode,
        stopIdByKey,
      );
      const scheduleIdByRouteDirection = await persistSchedules(tx, plan.schedules, routeIdByCode);
      await persistAssignments(tx, plan.assignments, riderIdByRoll, routeIdByCode, stopIdByKey);
      await persistTrips(tx, plan, {
        riderIdByRoll,
        driverIdByLicense,
        vehicleIdByRegistration,
        routeIdByCode,
        routeStopIdByRouteStop,
        scheduleIdByRouteDirection,
      });
      await persistFees(tx, plan, riderIdByRoll);
    },
    { timeout: 60_000, maxWait: 10_000 },
  );
}

async function persistRiders(tx: Tx, riders: RiderPlan[]): Promise<Map<string, string>> {
  const riderIdByRoll = new Map<string, string>();
  for (const rider of riders) {
    const email = seedEmail('', rider.rollNumber);
    const user = await tx.user.upsert({
      where: { email },
      create: {
        email,
        fullName: rider.fullName,
        role: UserRole.STUDENT,
        status: rider.userStatus,
      },
      update: {
        fullName: rider.fullName,
        role: UserRole.STUDENT,
        status: rider.userStatus,
      },
      select: { id: true },
    });
    const profile = await tx.studentProfile.upsert({
      where: { rollNumber: rider.rollNumber },
      create: {
        userId: user.id,
        rollNumber: rider.rollNumber,
        riderType: rider.riderType,
        department: rider.department,
        semester: rider.semester,
      },
      update: {
        userId: user.id,
        riderType: rider.riderType,
        department: rider.department,
        semester: rider.semester,
      },
      select: { id: true },
    });
    riderIdByRoll.set(rider.rollNumber, profile.id);
  }
  return riderIdByRoll;
}

async function persistGuardians(
  tx: Tx,
  guardians: GuardianPlan[],
  guardianships: GuardianshipPlan[],
  riderIdByRoll: Map<string, string>,
): Promise<void> {
  const parentIdByPhone = new Map<string, string>();
  for (const guardian of guardians) {
    const email = seedEmail('guardian-', guardian.phone);
    const user = await tx.user.upsert({
      where: { email },
      create: {
        email,
        fullName: guardian.fullName,
        phone: guardian.phone,
        role: UserRole.PARENT,
        status: UserStatus.ACTIVE,
      },
      update: {
        fullName: guardian.fullName,
        phone: guardian.phone,
        role: UserRole.PARENT,
        status: UserStatus.ACTIVE,
      },
      select: { id: true },
    });
    const profile = await tx.parentProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, phone: guardian.phone },
      update: { phone: guardian.phone },
      select: { id: true },
    });
    parentIdByPhone.set(guardian.phone, profile.id);
  }
  for (const link of guardianships) {
    const parentProfileId = requireMapped(parentIdByPhone, link.guardianPhone, 'guardian profile');
    const studentProfileId = requireMapped(riderIdByRoll, link.riderRoll, 'rider profile');
    await tx.guardianship.upsert({
      where: { parentProfileId_studentProfileId: { parentProfileId, studentProfileId } },
      // The source models exactly one guardian per student; all seeded
      // links are therefore primary.
      create: { parentProfileId, studentProfileId, isPrimary: true },
      update: { isPrimary: true },
    });
  }
}

async function persistDrivers(tx: Tx, drivers: SeedPlan['drivers']): Promise<Map<string, string>> {
  const driverIdByLicense = new Map<string, string>();
  for (const driver of drivers) {
    const email = seedEmail('driver-', driver.licenseNumber);
    const user = await tx.user.upsert({
      where: { email },
      create: {
        email,
        fullName: driver.fullName,
        phone: driver.phone,
        role: UserRole.DRIVER,
        status: UserStatus.ACTIVE,
      },
      update: {
        fullName: driver.fullName,
        phone: driver.phone,
        role: UserRole.DRIVER,
        status: UserStatus.ACTIVE,
      },
      select: { id: true },
    });
    const profile = await tx.driverProfile.upsert({
      where: { licenseNumber: driver.licenseNumber },
      create: {
        userId: user.id,
        licenseNumber: driver.licenseNumber,
        status: driver.status,
      },
      update: { userId: user.id, status: driver.status },
      select: { id: true },
    });
    driverIdByLicense.set(driver.licenseNumber, profile.id);
  }
  return driverIdByLicense;
}

async function persistVehicles(
  tx: Tx,
  vehicles: SeedPlan['vehicles'],
): Promise<Map<string, string>> {
  const vehicleIdByRegistration = new Map<string, string>();
  for (const vehicle of vehicles) {
    const record = await tx.vehicle.upsert({
      where: { registrationNumber: vehicle.registrationNumber },
      create: {
        code: vehicle.code,
        registrationNumber: vehicle.registrationNumber,
        capacitySeats: vehicle.capacitySeats,
        status: vehicle.status,
        model: vehicle.model,
      },
      update: {
        code: vehicle.code,
        capacitySeats: vehicle.capacitySeats,
        status: vehicle.status,
        model: vehicle.model,
      },
      select: { id: true },
    });
    vehicleIdByRegistration.set(vehicle.registrationNumber, record.id);
  }
  return vehicleIdByRegistration;
}

async function persistStops(tx: Tx, stops: SeedPlan['stops']): Promise<Map<StopKey, string>> {
  const stopIdByKey = new Map<StopKey, string>();
  for (const stop of stops) {
    // Stop has no natural unique in the 4A schema; (name, lat, lng) is the
    // dedup identity the transform already guarantees within the plan.
    const existing = await tx.stop.findFirst({
      where: { name: stop.name, latitude: stop.latitude, longitude: stop.longitude },
      select: { id: true },
    });
    const record =
      existing ??
      (await tx.stop.create({
        data: { name: stop.name, latitude: stop.latitude, longitude: stop.longitude },
        select: { id: true },
      }));
    stopIdByKey.set(stop.key, record.id);
  }
  return stopIdByKey;
}

async function persistRoutes(tx: Tx, routes: SeedPlan['routes']): Promise<Map<string, string>> {
  const routeIdByCode = new Map<string, string>();
  for (const route of routes) {
    const record = await tx.route.upsert({
      where: { code: route.code },
      create: {
        code: route.code,
        name: route.name,
        description: route.description,
        isActive: true,
      },
      update: { name: route.name, description: route.description, isActive: true },
      select: { id: true },
    });
    routeIdByCode.set(route.code, record.id);
  }
  return routeIdByCode;
}

async function persistRouteStops(
  tx: Tx,
  routeStops: SeedPlan['routeStops'],
  routeIdByCode: Map<string, string>,
  stopIdByKey: Map<StopKey, string>,
): Promise<Map<string, string>> {
  const routeStopIdByRouteStop = new Map<string, string>();
  for (const routeStop of routeStops) {
    const routeId = requireMapped(routeIdByCode, routeStop.routeCode, 'route');
    const stopId = requireMapped(stopIdByKey, routeStop.stopKey, 'stop');
    const record = await tx.routeStop.upsert({
      where: { routeId_stopId: { routeId, stopId } },
      create: {
        routeId,
        stopId,
        sequence: routeStop.sequence,
        arrivalOffsetMinutes: routeStop.arrivalOffsetMinutes,
        distanceFromOriginKm: routeStop.distanceFromOriginKm,
      },
      update: {
        sequence: routeStop.sequence,
        arrivalOffsetMinutes: routeStop.arrivalOffsetMinutes,
        distanceFromOriginKm: routeStop.distanceFromOriginKm,
      },
      select: { id: true },
    });
    routeStopIdByRouteStop.set(`${routeStop.routeCode}|${routeStop.stopKey}`, record.id);
  }
  return routeStopIdByRouteStop;
}

async function persistSchedules(
  tx: Tx,
  schedules: SeedPlan['schedules'],
  routeIdByCode: Map<string, string>,
): Promise<Map<string, string>> {
  const scheduleIdByRouteDirection = new Map<string, string>();
  for (const schedule of schedules) {
    const routeId = requireMapped(routeIdByCode, schedule.routeCode, 'route');
    const record = await tx.schedule.upsert({
      where: {
        routeId_direction_departureMinutesSinceMidnight: {
          routeId,
          direction: schedule.direction,
          departureMinutesSinceMidnight: schedule.departureMinutesSinceMidnight,
        },
      },
      create: {
        routeId,
        direction: schedule.direction,
        departureMinutesSinceMidnight: schedule.departureMinutesSinceMidnight,
        label: schedule.label,
        isActive: true,
      },
      update: { label: schedule.label, isActive: true },
      select: { id: true },
    });
    const key = routeDirectionKey(schedule.routeCode, schedule.direction);
    if (scheduleIdByRouteDirection.has(key)) {
      throw new Error(
        `Route "${schedule.routeCode}" has multiple ${schedule.direction} schedules in the plan; trip→schedule resolution requires one per direction`,
      );
    }
    scheduleIdByRouteDirection.set(key, record.id);
  }
  return scheduleIdByRouteDirection;
}

async function persistAssignments(
  tx: Tx,
  assignments: SeedPlan['assignments'],
  riderIdByRoll: Map<string, string>,
  routeIdByCode: Map<string, string>,
  stopIdByKey: Map<StopKey, string>,
): Promise<void> {
  for (const assignment of assignments) {
    const studentProfileId = requireMapped(riderIdByRoll, assignment.riderRoll, 'rider profile');
    const routeId = requireMapped(routeIdByCode, assignment.routeCode, 'route');
    const stopId = requireMapped(stopIdByKey, assignment.stopKey, 'stop');
    // TransportAssignment has no natural unique (app-layer invariant by 4A
    // design); the full tuple is the deterministic identity.
    const existing = await tx.transportAssignment.findFirst({
      where: {
        studentProfileId,
        routeId,
        stopId,
        direction: assignment.direction, // null matches IS NULL (both journeys)
      },
      select: { id: true },
    });
    if (existing === null) {
      await tx.transportAssignment.create({
        data: { studentProfileId, routeId, stopId, direction: assignment.direction },
      });
    }
  }
}

interface TripLookupMaps {
  riderIdByRoll: Map<string, string>;
  driverIdByLicense: Map<string, string>;
  vehicleIdByRegistration: Map<string, string>;
  routeIdByCode: Map<string, string>;
  routeStopIdByRouteStop: Map<string, string>;
  scheduleIdByRouteDirection: Map<string, string>;
}

async function persistTrips(tx: Tx, plan: SeedPlan, maps: TripLookupMaps): Promise<void> {
  const tripIdByRouteDirection = new Map<string, string>();

  for (const trip of plan.trips) {
    const routeId = requireMapped(maps.routeIdByCode, trip.routeCode, 'route');
    const vehicleId = requireMapped(
      maps.vehicleIdByRegistration,
      trip.vehicleRegistration,
      'vehicle',
    );
    const driverId = requireMapped(maps.driverIdByLicense, trip.driverLicense, 'driver');
    const scheduleId = resolveFixtureScheduleId(plan, maps, trip);

    // Trip has no natural unique; for the fixture seed, the tuple
    // (route, schedule, service date, vehicle) identifies the row.
    const existing = await tx.trip.findFirst({
      where: { routeId, scheduleId, serviceDate: trip.serviceDate, vehicleId },
      select: { id: true },
    });
    const record = existing
      ? await tx.trip.update({
          where: { id: existing.id },
          data: {
            status: trip.status,
            plannedDepartureAt: trip.plannedDepartureAt,
            plannedArrivalAt: trip.plannedArrivalAt,
            driverId,
          },
          select: { id: true },
        })
      : await tx.trip.create({
          data: {
            routeId,
            scheduleId,
            vehicleId,
            driverId,
            serviceDate: trip.serviceDate,
            status: trip.status,
            plannedDepartureAt: trip.plannedDepartureAt,
            plannedArrivalAt: trip.plannedArrivalAt,
          },
          select: { id: true },
        });

    const key = routeDirectionKey(trip.routeCode, trip.direction);
    if (tripIdByRouteDirection.has(key)) {
      throw new Error(
        `Multiple fixture trips for ${key}; passenger state mapping requires one trip per route+direction`,
      );
    }
    tripIdByRouteDirection.set(key, record.id);
  }

  for (const tripStop of plan.tripStops) {
    const tripId = requireMapped(
      tripIdByRouteDirection,
      routeDirectionKey(tripStop.routeCode, tripStop.direction),
      'fixture trip',
    );
    const routeStopId = requireMapped(
      maps.routeStopIdByRouteStop,
      `${tripStop.routeCode}|${tripStop.stopKey}`,
      'route stop',
    );
    await tx.tripStop.upsert({
      where: { tripId_routeStopId: { tripId, routeStopId } },
      create: {
        tripId,
        routeStopId,
        sequence: tripStop.sequence,
        plannedArrivalAt: tripStop.plannedArrivalAt,
        status: tripStop.status,
      },
      update: {
        sequence: tripStop.sequence,
        plannedArrivalAt: tripStop.plannedArrivalAt,
        status: tripStop.status,
      },
    });
  }

  for (const passenger of plan.tripPassengers) {
    const tripId = requireMapped(
      tripIdByRouteDirection,
      routeDirectionKey(passenger.routeCode, passenger.direction),
      'fixture trip',
    );
    const studentProfileId = requireMapped(
      maps.riderIdByRoll,
      passenger.riderRoll,
      'rider profile',
    );
    await tx.tripPassenger.upsert({
      where: { tripId_studentProfileId: { tripId, studentProfileId } },
      create: {
        tripId,
        studentProfileId,
        status: passenger.status,
        pickedUpAt: passenger.pickedUpAt,
      },
      update: { status: passenger.status, pickedUpAt: passenger.pickedUpAt },
    });
  }
}

function resolveFixtureScheduleId(plan: SeedPlan, maps: TripLookupMaps, trip: TripPlan): string {
  const schedulePlan = plan.schedules.find(
    (schedule) => schedule.routeCode === trip.routeCode && schedule.direction === trip.direction,
  );
  if (schedulePlan === undefined) {
    throw new Error(`No ${trip.direction} schedule derived for route "${trip.routeCode}"`);
  }
  // A fixture trip departs exactly per its schedule; anything else means the
  // source state and the timetable disagree.
  const departureMinutes = minutesOfUtcDay(trip.plannedDepartureAt);
  if (departureMinutes !== schedulePlan.departureMinutesSinceMidnight) {
    throw new Error(
      `Fixture trip on "${trip.routeCode}" (${trip.direction}) departs at minute ${departureMinutes}, but the schedule says ${schedulePlan.departureMinutesSinceMidnight}`,
    );
  }
  return requireMapped(
    maps.scheduleIdByRouteDirection,
    routeDirectionKey(trip.routeCode, trip.direction),
    'schedule',
  );
}

async function persistFees(
  tx: Tx,
  plan: SeedPlan,
  riderIdByRoll: Map<string, string>,
): Promise<void> {
  const fee = plan.feeDefinition;
  const existingFee = await tx.feeDefinition.findFirst({
    where: { name: fee.name, term: fee.term },
    select: { id: true },
  });
  const feeDefinitionId = existingFee
    ? (
        await tx.feeDefinition.update({
          where: { id: existingFee.id },
          data: { amountMinor: fee.amountMinor },
          select: { id: true },
        })
      ).id
    : (
        await tx.feeDefinition.create({
          data: { name: fee.name, term: fee.term, amountMinor: fee.amountMinor },
          select: { id: true },
        })
      ).id;

  const invoiceIdByRoll = new Map<string, string>();
  for (const invoice of plan.invoices) {
    const studentProfileId = requireMapped(riderIdByRoll, invoice.riderRoll, 'rider profile');
    // One transport-fee invoice per rider per fee definition.
    const existingInvoice = await tx.invoice.findFirst({
      where: { studentProfileId, feeDefinitionId },
      select: { id: true },
    });
    const record = existingInvoice
      ? await tx.invoice.update({
          where: { id: existingInvoice.id },
          data: {
            amountMinor: invoice.amountMinor,
            status: invoice.status,
            dueDate: invoice.dueDate,
          },
          select: { id: true },
        })
      : await tx.invoice.create({
          data: {
            studentProfileId,
            feeDefinitionId,
            amountMinor: invoice.amountMinor,
            status: invoice.status,
            dueDate: invoice.dueDate,
          },
          select: { id: true },
        });
    invoiceIdByRoll.set(invoice.riderRoll, record.id);
  }

  for (const payment of plan.payments) {
    const invoiceId = requireMapped(invoiceIdByRoll, payment.riderRoll, 'invoice');
    // DEMO_PAYMENT_REFERENCE classifies the row as a demo fixture and is the
    // idempotency key for re-runs.
    const existingPayment = await tx.payment.findFirst({
      where: { invoiceId, externalReference: DEMO_PAYMENT_REFERENCE },
      select: { id: true },
    });
    if (existingPayment === null) {
      await tx.payment.create({
        data: {
          invoiceId,
          amountMinor: payment.amountMinor,
          method: payment.method,
          status: payment.status,
          externalReference: DEMO_PAYMENT_REFERENCE,
        },
      });
    }
  }
}
