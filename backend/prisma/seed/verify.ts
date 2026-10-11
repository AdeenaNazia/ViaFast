// Post-seed verification: compares live database state against the plan the
// seed derived from the source data. Expected values are computed from the
// plan (never hardcoded), so checks stay truthful when the source changes.
// Relationship checks assert what the schema cannot express: stop ordering
// per route, assignment↔route/stop membership, guardian links, fixture-trip
// shape, and invoice/payment arithmetic. The seed verification assumes a
// database owned by the seed (development fixture state).

import { PrismaClient } from '@prisma/client';
import { SeedPlan, stopKeyOf } from './transform';
import { seedServiceDate } from './time';
import { DEMO_PAYMENT_REFERENCE } from './persist';

export interface CountCheck {
  model: string;
  expected: number;
  actual: number;
}

export interface RelationshipCheck {
  name: string;
  passed: boolean;
  detail: string | null;
}

export interface VerificationResult {
  counts: CountCheck[];
  relationships: RelationshipCheck[];
  pass: boolean;
}

function countCheck(model: string, expected: number, actual: number): CountCheck {
  return { model, expected, actual };
}

function relationshipCheck(
  name: string,
  passed: boolean,
  detail: string | null = null,
): RelationshipCheck {
  return { name, passed, detail };
}

export async function verifySeed(
  prisma: PrismaClient,
  plan: SeedPlan,
): Promise<VerificationResult> {
  const expectedUsers = plan.riders.length + plan.guardians.length + plan.drivers.length;
  const [
    users,
    studentUsers,
    parentUsers,
    driverUsers,
    adminUsers,
    students,
    parents,
    guardianships,
    drivers,
    vehicles,
    stops,
    routes,
    routeStops,
    schedules,
    assignments,
    trips,
    tripStops,
    tripPassengers,
    fees,
    invoices,
    payments,
    trackingSessions,
    gpsReadings,
    vehiclePositions,
    incidents,
    notifications,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.user.count({ where: { role: 'PARENT' } }),
    prisma.user.count({ where: { role: 'DRIVER' } }),
    prisma.user.count({ where: { role: 'ADMIN' } }),
    prisma.studentProfile.count(),
    prisma.parentProfile.count(),
    prisma.guardianship.count(),
    prisma.driverProfile.count(),
    prisma.vehicle.count(),
    prisma.stop.count(),
    prisma.route.count(),
    prisma.routeStop.count(),
    prisma.schedule.count(),
    prisma.transportAssignment.count(),
    prisma.trip.count(),
    prisma.tripStop.count(),
    prisma.tripPassenger.count(),
    prisma.feeDefinition.count(),
    prisma.invoice.count(),
    prisma.payment.count(),
    prisma.trackingSession.count(),
    prisma.gpsReading.count(),
    prisma.vehiclePosition.count(),
    prisma.incident.count(),
    prisma.notification.count(),
  ]);

  const counts: CountCheck[] = [
    countCheck('users (total)', expectedUsers, users),
    countCheck('users (STUDENT role)', plan.riders.length, studentUsers),
    countCheck('users (PARENT role)', plan.guardians.length, parentUsers),
    countCheck('users (DRIVER role)', plan.drivers.length, driverUsers),
    countCheck('users (ADMIN role)', 0, adminUsers),
    countCheck('StudentProfile (riders)', plan.riders.length, students),
    countCheck('ParentProfile (guardians)', plan.guardians.length, parents),
    countCheck('Guardianship', plan.guardianships.length, guardianships),
    countCheck('DriverProfile', plan.drivers.length, drivers),
    countCheck('Vehicle', plan.vehicles.length, vehicles),
    countCheck('Stop (deduplicated)', plan.stops.length, stops),
    countCheck('Route', plan.routes.length, routes),
    countCheck('RouteStop', plan.routeStops.length, routeStops),
    countCheck('Schedule', plan.schedules.length, schedules),
    countCheck('TransportAssignment', plan.assignments.length, assignments),
    countCheck('Trip (fixtures)', plan.trips.length, trips),
    countCheck('TripStop', plan.tripStops.length, tripStops),
    countCheck('TripPassenger', plan.tripPassengers.length, tripPassengers),
    countCheck('FeeDefinition', 1, fees),
    countCheck('Invoice', plan.invoices.length, invoices),
    countCheck('Payment (demo fixtures)', plan.payments.length, payments),
    countCheck('TrackingSession (excluded)', 0, trackingSessions),
    countCheck('GpsReading (excluded)', 0, gpsReadings),
    countCheck('VehiclePosition (excluded)', 0, vehiclePositions),
    countCheck('Incident (excluded)', 0, incidents),
    countCheck('Notification (excluded)', 0, notifications),
  ];

  const relationships: RelationshipCheck[] = [];

  // --- Route stop ordering + assignment membership (one query serves both) ---
  const dbRouteStops = await prisma.routeStop.findMany({
    where: { route: { code: { in: plan.routes.map((route) => route.code) } } },
    select: {
      sequence: true,
      route: { select: { code: true } },
      stop: { select: { name: true, latitude: true, longitude: true } },
    },
  });
  const stopSequencesByRoute = new Map<string, { sequence: number; stopKey: string }[]>();
  for (const row of dbRouteStops) {
    // Route.code is nullable in the schema, but the query above filters on it.
    if (row.route.code === null) {
      throw new Error('Verification query returned a route stop whose route has no code');
    }
    const list = stopSequencesByRoute.get(row.route.code) ?? [];
    list.push({
      sequence: row.sequence,
      stopKey: stopKeyOf(row.stop.name, row.stop.latitude, row.stop.longitude),
    });
    stopSequencesByRoute.set(row.route.code, list);
  }

  const unorderedRoutes = [...stopSequencesByRoute.entries()]
    .filter(([, list]) => {
      const ordered = [...list].sort((a, b) => a.sequence - b.sequence);
      return !ordered.every((entry, index) => entry.sequence === index + 1);
    })
    .map(([code]) => code);
  relationships.push(
    relationshipCheck(
      'route stop sequences are contiguous 1..N per route',
      unorderedRoutes.length === 0,
      unorderedRoutes.length === 0 ? null : `non-contiguous: ${unorderedRoutes.join(', ')}`,
    ),
  );

  const assignmentsOffRoute = plan.assignments.filter((assignment) => {
    const list = stopSequencesByRoute.get(assignment.routeCode);
    return list === undefined || !list.some((entry) => entry.stopKey === assignment.stopKey);
  });
  relationships.push(
    relationshipCheck(
      'every transport assignment stop lies on its route',
      assignmentsOffRoute.length === 0,
      assignmentsOffRoute.length === 0
        ? null
        : `${assignmentsOffRoute.length} assignment(s) reference a stop off their route`,
    ),
  );

  // --- Fixture passengers must have a standing assignment on the trip route ---
  const dbAssignments = await prisma.transportAssignment.findMany({
    select: {
      studentProfile: { select: { rollNumber: true } },
      route: { select: { code: true } },
    },
  });
  const assignmentKeys = new Set(
    dbAssignments.map((row) => `${row.studentProfile.rollNumber}|${row.route.code}`),
  );
  const orphanPassengers = plan.tripPassengers.filter(
    (passenger) => !assignmentKeys.has(`${passenger.riderRoll}|${passenger.routeCode}`),
  );
  relationships.push(
    relationshipCheck(
      'every fixture passenger has a transport assignment on the trip route',
      orphanPassengers.length === 0,
      orphanPassengers.length === 0
        ? null
        : `missing assignment: ${orphanPassengers
            .map((passenger) => `${passenger.riderRoll} on ${passenger.routeCode}`)
            .join(', ')}`,
    ),
  );

  // --- Guardian links match the plan ---
  const guardianRolls = [...new Set(plan.guardianships.map((link) => link.riderRoll))];
  const nonGuardianRolls = plan.riders
    .filter((rider) => !guardianRolls.includes(rider.rollNumber))
    .map((rider) => rider.rollNumber);
  const [ridersMissingGuardian, ridersWithUnexpectedGuardian] = await Promise.all([
    prisma.studentProfile.count({
      where: { rollNumber: { in: guardianRolls }, guardianships: { none: {} } },
    }),
    prisma.studentProfile.count({
      where: { rollNumber: { in: nonGuardianRolls }, guardianships: { some: {} } },
    }),
  ]);
  relationships.push(
    relationshipCheck(
      'guardianship links match the plan (present for guardians, absent otherwise)',
      ridersMissingGuardian === 0 && ridersWithUnexpectedGuardian === 0,
      `missing: ${ridersMissingGuardian}, unexpected: ${ridersWithUnexpectedGuardian}`,
    ),
  );

  // --- Fixture trip shape ---
  const dbTrips = await prisma.trip.findMany({
    where: { serviceDate: seedServiceDate() },
    select: {
      route: { select: { code: true } },
      schedule: { select: { direction: true } },
      _count: { select: { tripStops: true, passengers: true } },
    },
  });
  const expectedTripStopCounts = new Map<string, number>();
  for (const tripStop of plan.tripStops) {
    const key = `${tripStop.routeCode}|${tripStop.direction}`;
    expectedTripStopCounts.set(key, (expectedTripStopCounts.get(key) ?? 0) + 1);
  }
  const expectedPassengerCounts = new Map<string, number>();
  for (const passenger of plan.tripPassengers) {
    const key = `${passenger.routeCode}|${passenger.direction}`;
    expectedPassengerCounts.set(key, (expectedPassengerCounts.get(key) ?? 0) + 1);
  }
  const tripShapeViolations: string[] = [];
  if (dbTrips.length !== plan.trips.length) {
    tripShapeViolations.push(
      `expected ${plan.trips.length} fixture trips, found ${dbTrips.length}`,
    );
  }
  for (const trip of dbTrips) {
    if (trip.schedule === null) {
      tripShapeViolations.push('fixture trip without a schedule link');
      continue;
    }
    const key = `${trip.route.code}|${trip.schedule.direction}`;
    const expectedStops = expectedTripStopCounts.get(key) ?? 0;
    const expectedPassengers = expectedPassengerCounts.get(key) ?? 0;
    if (trip._count.tripStops !== expectedStops) {
      tripShapeViolations.push(
        `${key}: ${trip._count.tripStops} trip stops, expected ${expectedStops}`,
      );
    }
    if (trip._count.passengers !== expectedPassengers) {
      tripShapeViolations.push(
        `${key}: ${trip._count.passengers} passengers, expected ${expectedPassengers}`,
      );
    }
  }
  relationships.push(
    relationshipCheck(
      'fixture trips carry the full route stop list and planned passengers',
      tripShapeViolations.length === 0,
      tripShapeViolations.length === 0 ? null : tripShapeViolations.join('; '),
    ),
  );

  // --- Fees: invoice/payment arithmetic + demo classification ---
  const dbInvoices = await prisma.invoice.findMany({
    select: {
      status: true,
      amountMinor: true,
      payments: { select: { status: true, amountMinor: true } },
    },
  });
  const arithmeticViolations: string[] = [];
  for (const invoice of dbInvoices) {
    const paid = invoice.payments
      .filter((payment) => payment.status === 'SUCCEEDED')
      .reduce((sum, payment) => sum + payment.amountMinor, 0);
    const consistent =
      (invoice.status === 'PAID' && paid >= invoice.amountMinor) ||
      (invoice.status === 'PARTIALLY_PAID' && paid > 0 && paid < invoice.amountMinor) ||
      (invoice.status === 'PENDING' && paid === 0) ||
      invoice.status === 'VOID';
    if (!consistent) {
      arithmeticViolations.push(
        `${invoice.status} invoice with ${paid} paisa of SUCCEEDED payments against ${invoice.amountMinor}`,
      );
    }
  }
  relationships.push(
    relationshipCheck(
      'invoice status agrees with SUCCEEDED payment totals (paisa)',
      arithmeticViolations.length === 0,
      arithmeticViolations.length === 0 ? null : arithmeticViolations.join('; '),
    ),
  );

  const demoPayments = await prisma.payment.count({
    where: { externalReference: DEMO_PAYMENT_REFERENCE },
  });
  relationships.push(
    relationshipCheck(
      'seeded payments are demo-classified and not duplicated',
      demoPayments === plan.payments.length,
      `demo payments: ${demoPayments}, plan: ${plan.payments.length}`,
    ),
  );

  // --- Placeholder identity emails ---
  const placeholderUsers = await prisma.user.count({
    where: { email: { endsWith: '@seed.viafast.example' } },
  });
  relationships.push(
    relationshipCheck(
      'seeded users carry placeholder identity emails (@seed.viafast.example)',
      placeholderUsers === expectedUsers,
      `placeholder users: ${placeholderUsers}, expected: ${expectedUsers}`,
    ),
  );

  const pass =
    counts.every((check) => check.expected === check.actual) &&
    relationships.every((check) => check.passed);

  return { counts, relationships, pass };
}
