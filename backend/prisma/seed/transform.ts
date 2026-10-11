// Pure transformation: frontend source data (src/data/initialData.ts shape)
// → Phase 4A domain plans. No database access here — this layer is unit
// tested with fixtures and must stay deterministic.
//
// Transformation rules (documented per Phase 4B):
// - Physical stops are deduplicated by (name, latitude, longitude). The same
//   name at different coordinates (e.g. "Northern Bypass Chowk" on Route 3)
//   stays a distinct stop; a variant name at identical coordinates (e.g.
//   "Northern Bypass Chowk to MPS Road") also stays distinct — the seed never
//   silently merges named entities.
// - Route stop ordering is preserved exactly from the source arrays; the
//   source sequence numbers must match the array order 1..N or the transform
//   fails loudly.
// - Schedules are derived: MORNING departure = route.morningStartTime;
//   RETURN departure = the Campus stop's returnTime (3:30 PM on all source
//   routes). RouteStop.arrivalOffsetMinutes holds MORNING offsets; the 4A
//   schema has a single offset column, so return-direction stop times are
//   derivable but not stored (documented limitation).
// - Trips/tripStops/tripPassengers are SYNTHETIC CURRENT-DAY FIXTURES: the
//   source's simulated morning state (INITIAL_ACTIVE_TRIPS + journeyStatus)
//   snapshot onto the fixed fixture date SEED_SERVICE_DATE_ISO. No historical
//   trips are manufactured.
// - Money is always integer paisa (PKR × 100).
// - `isStaff` is not preserved as a boolean: staff riders become
//   StudentProfile(riderType: STAFF, rollNumber: staffId).

import {
  DriverStatus,
  InvoiceStatus,
  JourneyDirection,
  PassengerTripStatus,
  PaymentMethod,
  PaymentStatus,
  RiderType,
  TripStatus,
  TripStopStatus,
  UserStatus,
  VehicleStatus,
} from '@prisma/client';
import { SourceData, SourceRoute, SourceRouteStop, SourceStudent } from './source';
import { parseClockToMinutes, parseDayMonthYear, seedServiceDate, serviceDateTime } from './time';

export type StopKey = string;

/** Stable identity for a physical stop within the seed (name|lat|lng). */
export function stopKeyOf(name: string, lat: number, lng: number): StopKey {
  return `${name}|${lat}|${lng}`;
}

export interface RiderPlan {
  rollNumber: string;
  fullName: string;
  riderType: RiderType;
  department: string | null;
  semester: number | null;
  userStatus: UserStatus;
  guardian: { fullName: string; phone: string } | null;
}

export interface GuardianPlan {
  phone: string;
  fullName: string;
}

export interface GuardianshipPlan {
  guardianPhone: string;
  riderRoll: string;
}

export interface DriverPlan {
  licenseNumber: string;
  fullName: string;
  phone: string;
  status: DriverStatus;
}

export interface VehiclePlan {
  /** External reference (Vehicle.code) for deterministic lookups, not a PK. */
  code: string;
  registrationNumber: string;
  capacitySeats: number;
  status: VehicleStatus;
  model: string;
}

export interface StopPlan {
  key: StopKey;
  name: string;
  latitude: number;
  longitude: number;
}

export interface RoutePlan {
  code: string;
  name: string;
  /** Source route orientation, preserved verbatim (e.g. "Inbound to Campus"). */
  description: string;
}

export interface RouteStopPlan {
  routeCode: string;
  stopKey: StopKey;
  sequence: number;
  arrivalOffsetMinutes: number;
  distanceFromOriginKm: number;
}

export interface SchedulePlan {
  routeCode: string;
  direction: JourneyDirection;
  departureMinutesSinceMidnight: number;
  label: string;
}

export interface AssignmentPlan {
  riderRoll: string;
  routeCode: string;
  stopKey: StopKey;
  /** null = the assignment applies to both journeys (Phase 4A semantics). */
  direction: JourneyDirection | null;
}

export interface TripPlan {
  routeCode: string;
  direction: JourneyDirection;
  vehicleRegistration: string;
  driverLicense: string;
  serviceDate: Date;
  status: TripStatus;
  plannedDepartureAt: Date;
  plannedArrivalAt: Date;
}

export interface TripStopPlan {
  routeCode: string;
  direction: JourneyDirection;
  stopKey: StopKey;
  sequence: number;
  plannedArrivalAt: Date;
  status: TripStopStatus;
}

export interface TripPassengerPlan {
  routeCode: string;
  direction: JourneyDirection;
  riderRoll: string;
  status: PassengerTripStatus;
  pickedUpAt: Date | null;
}

export interface FeePlan {
  name: string;
  term: string;
  amountMinor: number;
}

export interface InvoicePlan {
  riderRoll: string;
  amountMinor: number;
  status: InvoiceStatus;
  dueDate: Date | null;
}

export interface PaymentPlan {
  riderRoll: string;
  amountMinor: number;
  method: PaymentMethod;
  status: PaymentStatus;
}

export interface SeedPlan {
  riders: RiderPlan[];
  guardians: GuardianPlan[];
  guardianships: GuardianshipPlan[];
  drivers: DriverPlan[];
  vehicles: VehiclePlan[];
  stops: StopPlan[];
  routes: RoutePlan[];
  routeStops: RouteStopPlan[];
  schedules: SchedulePlan[];
  assignments: AssignmentPlan[];
  trips: TripPlan[];
  tripStops: TripStopPlan[];
  tripPassengers: TripPassengerPlan[];
  feeDefinition: FeePlan;
  invoices: InvoicePlan[];
  payments: PaymentPlan[];
}

function mapRegistrationStatus(value: string): UserStatus {
  switch (value) {
    case 'Active':
    case 'Approved':
      return UserStatus.ACTIVE;
    case 'Pending':
      return UserStatus.INVITED;
    case 'Rejected':
      return UserStatus.ARCHIVED;
    default:
      throw new Error(`Unknown registrationStatus: "${value}"`);
  }
}

function mapVehicleStatus(value: string): VehicleStatus {
  switch (value) {
    case 'Active':
    case 'Delayed': // delay is a live-trip state, not a vehicle lifecycle state
    case 'Reserve': // reserve-ness = absence of assignment
      return VehicleStatus.ACTIVE;
    case 'Maintenance':
      return VehicleStatus.MAINTENANCE;
    default:
      throw new Error(`Unknown vehicle status: "${value}"`);
  }
}

function mapDriverStatus(value: string): DriverStatus {
  switch (value) {
    case 'On Trip':
      return DriverStatus.ON_DUTY;
    case 'Ready':
    case 'Standby':
      return DriverStatus.AVAILABLE;
    case 'Off Duty':
      return DriverStatus.OFF_DUTY;
    default:
      throw new Error(`Unknown driver status: "${value}"`);
  }
}

function mapTripStatus(value: string): TripStatus {
  switch (value) {
    case 'Scheduled':
      return TripStatus.PLANNED;
    case 'Boarding':
    case 'In Progress':
    case 'Delayed': // delay is runtime state; the trip itself is still active
      return TripStatus.ACTIVE;
    case 'Completed':
      return TripStatus.COMPLETED;
    default:
      throw new Error(`Unknown trip status: "${value}"`);
  }
}

function mapJourneyStatus(value: string): PassengerTripStatus {
  switch (value) {
    case 'Waiting':
      return PassengerTripStatus.ASSIGNED;
    case 'Picked Up':
    case 'On Board':
      return PassengerTripStatus.PICKED_UP;
    case 'Dropped Off':
      return PassengerTripStatus.DROPPED_OFF;
    case 'Absent':
      return PassengerTripStatus.ABSENT;
    default:
      throw new Error(`Unknown journeyStatus: "${value}"`);
  }
}

function mapDirection(value: string): JourneyDirection {
  switch (value) {
    case 'morning':
      return JourneyDirection.MORNING;
    case 'return':
      return JourneyDirection.RETURN;
    default:
      throw new Error(`Unknown tripType: "${value}"`);
  }
}

function parseSemester(value: string | number): number | null {
  if (typeof value === 'number') {
    return value;
  }
  const match = /^(\d+)/.exec(value.trim());
  if (match === null) {
    throw new Error(`Unparseable semester value: "${value}"`);
  }
  return Number(match[1]);
}

function riderRollOf(student: SourceStudent): string {
  return student.rollNumber ?? student.studentId;
}

function requireRoute(routesById: Map<string, SourceRoute>, routeId: string): SourceRoute {
  const route = routesById.get(routeId);
  if (route === undefined) {
    throw new Error(`Unknown route id "${routeId}" referenced by source data`);
  }
  return route;
}

function requireStopKey(keysBySourceId: Map<string, StopKey>, sourceStopId: string): StopKey {
  const key = keysBySourceId.get(sourceStopId);
  if (key === undefined) {
    throw new Error(`Unknown source stop id "${sourceStopId}"`);
  }
  return key;
}

function requireFixtureTrip(
  trips: TripPlan[],
  routeCode: string,
  direction: JourneyDirection,
): void {
  const exists = trips.some((trip) => trip.routeCode === routeCode && trip.direction === direction);
  if (!exists) {
    throw new Error(
      `Rider journey state references ${direction} fixture trip of route "${routeCode}", but no such source trip exists`,
    );
  }
}

function orderedStopsOf(route: SourceRoute): SourceRouteStop[] {
  route.stops.forEach((stop, index) => {
    if (stop.sequence !== index + 1) {
      throw new Error(
        `Route "${route.id}": stop sequence ${stop.sequence} at position ${index + 1} breaks source ordering`,
      );
    }
  });
  return route.stops;
}

export function transformSource(source: SourceData): SeedPlan {
  const routesById = new Map(source.routes.map((route) => [route.id, route]));
  const vehiclesById = new Map(source.vehicles.map((vehicle) => [vehicle.id, vehicle]));
  const driversById = new Map(source.drivers.map((driver) => [driver.id, driver]));

  // ---- Physical stops (dedup identical name+coords across routes) ----
  const stops: StopPlan[] = [];
  const stopKeyBySourceId = new Map<string, StopKey>();
  const seenStopKeys = new Set<StopKey>();
  for (const route of source.routes) {
    for (const stop of route.stops) {
      const key = stopKeyOf(stop.name, stop.lat, stop.lng);
      stopKeyBySourceId.set(stop.id, key);
      if (!seenStopKeys.has(key)) {
        seenStopKeys.add(key);
        stops.push({ key, name: stop.name, latitude: stop.lat, longitude: stop.lng });
      }
    }
  }

  const routes: RoutePlan[] = source.routes.map((route) => ({
    code: route.id, // external reference for deterministic upserts, not a PK
    name: route.name,
    description: route.direction,
  }));

  // ---- Route stops (source ordering preserved exactly) + schedules ----
  const routeStops: RouteStopPlan[] = [];
  const schedules: SchedulePlan[] = [];
  for (const route of source.routes) {
    const orderedStops = orderedStopsOf(route);
    const departureMinutes = parseClockToMinutes(route.morningStartTime);
    for (const stop of orderedStops) {
      const arrivalMinutes = parseClockToMinutes(stop.morningTime);
      const offset = arrivalMinutes - departureMinutes;
      if (offset < 0) {
        throw new Error(
          `Route "${route.id}" stop "${stop.name}": morning time precedes route departure`,
        );
      }
      routeStops.push({
        routeCode: route.id,
        stopKey: requireStopKey(stopKeyBySourceId, stop.id),
        sequence: stop.sequence,
        arrivalOffsetMinutes: offset,
        distanceFromOriginKm: stop.distanceKm,
      });
    }
    schedules.push({
      routeCode: route.id,
      direction: JourneyDirection.MORNING,
      departureMinutesSinceMidnight: departureMinutes,
      label: 'Morning Service',
    });
    schedules.push({
      routeCode: route.id,
      direction: JourneyDirection.RETURN,
      departureMinutesSinceMidnight: parseClockToMinutes(
        orderedStops[orderedStops.length - 1].returnTime,
      ),
      label: 'Return Service',
    });
  }

  // ---- Riders: students + staff passengers ----
  const riders: RiderPlan[] = [];
  const guardiansByPhone = new Map<string, GuardianPlan>();
  const guardianships: GuardianshipPlan[] = [];

  for (const student of source.students) {
    const roll = riderRollOf(student);
    riders.push({
      rollNumber: roll,
      fullName: student.name,
      riderType: student.isStaff === true ? RiderType.STAFF : RiderType.STUDENT,
      department: student.department,
      semester: parseSemester(student.semester),
      userStatus: mapRegistrationStatus(student.registrationStatus),
      guardian:
        student.parentPhone !== undefined
          ? {
              fullName: student.parentName ?? `Guardian of ${student.name}`,
              phone: student.parentPhone,
            }
          : null,
    });
    if (student.parentPhone !== undefined) {
      if (!guardiansByPhone.has(student.parentPhone)) {
        guardiansByPhone.set(student.parentPhone, {
          phone: student.parentPhone,
          fullName: student.parentName ?? `Guardian of ${student.name}`,
        });
      }
      guardianships.push({ guardianPhone: student.parentPhone, riderRoll: roll });
    }
  }

  for (const staff of source.staffPassengers) {
    riders.push({
      rollNumber: staff.staffId,
      fullName: staff.name,
      riderType: RiderType.STAFF,
      department: staff.department,
      semester: null,
      userStatus: mapRegistrationStatus(staff.status),
      guardian: null,
    });
  }

  // ---- Drivers and vehicles ----
  const drivers: DriverPlan[] = source.drivers.map((driver) => ({
    licenseNumber: driver.licenseNumber,
    fullName: driver.name,
    phone: driver.cell,
    status: mapDriverStatus(driver.status),
  }));

  const vehicles: VehiclePlan[] = source.vehicles.map((vehicle) => ({
    code: vehicle.id,
    registrationNumber: vehicle.vehicleNumber,
    capacitySeats: vehicle.capacity,
    status: mapVehicleStatus(vehicle.status),
    model: vehicle.type,
  }));

  // ---- Transport assignments (standing rider → route/stop context) ----
  const assignments: AssignmentPlan[] = [];
  for (const student of source.students) {
    const route = requireRoute(routesById, student.routeId);
    assignments.push({
      riderRoll: riderRollOf(student),
      routeCode: route.id,
      stopKey: requireStopKey(stopKeyBySourceId, student.pickupStopId),
      direction: null, // registered riders use both journeys
    });
  }
  for (const staff of source.staffPassengers) {
    const routeCode = staff.assignedRouteId;
    if (routeCode === undefined) {
      throw new Error(`Staff passenger ${staff.staffId} has no assigned route`);
    }
    const route = requireRoute(routesById, routeCode);
    const stopEntry = route.stops.find((stop) => stop.name === staff.pickupStop);
    if (stopEntry === undefined) {
      throw new Error(
        `Staff passenger ${staff.staffId}: pickup stop "${staff.pickupStop}" not found on route ${routeCode}`,
      );
    }
    assignments.push({
      riderRoll: staff.staffId,
      routeCode,
      stopKey: stopKeyOf(stopEntry.name, stopEntry.lat, stopEntry.lng),
      direction: mapDirection(staff.tripType),
    });
  }

  // ---- Synthetic current-day trip fixtures ----
  const trips: TripPlan[] = [];
  const tripStops: TripStopPlan[] = [];
  for (const sourceTrip of source.activeTrips) {
    const route = requireRoute(routesById, sourceTrip.routeId);
    const vehicle = vehiclesById.get(sourceTrip.busId);
    const driver = driversById.get(sourceTrip.driverId);
    if (vehicle === undefined || driver === undefined) {
      throw new Error(
        `Trip ${sourceTrip.id}: unknown vehicle/driver reference (${sourceTrip.busId}/${sourceTrip.driverId})`,
      );
    }
    const direction = mapDirection(sourceTrip.tripType);
    trips.push({
      routeCode: route.id,
      direction,
      vehicleRegistration: vehicle.vehicleNumber,
      driverLicense: driver.licenseNumber,
      serviceDate: seedServiceDate(),
      status: mapTripStatus(sourceTrip.status),
      plannedDepartureAt: serviceDateTime(parseClockToMinutes(sourceTrip.startedAt)),
      plannedArrivalAt: serviceDateTime(parseClockToMinutes(route.campusArrivalTime)),
    });

    const orderedStops = orderedStopsOf(route);
    orderedStops.forEach((stop, index) => {
      const sequence =
        direction === JourneyDirection.MORNING ? index + 1 : orderedStops.length - index;
      const clock = direction === JourneyDirection.MORNING ? stop.morningTime : stop.returnTime;
      // currentStopIndex counts reached stops in the trip's own visit order,
      // which `sequence` encodes for both directions.
      const arrived = sequence <= sourceTrip.currentStopIndex + 1;
      tripStops.push({
        routeCode: route.id,
        direction,
        stopKey: requireStopKey(stopKeyBySourceId, stop.id),
        sequence,
        plannedArrivalAt: serviceDateTime(parseClockToMinutes(clock)),
        status: arrived ? TripStopStatus.ARRIVED : TripStopStatus.PENDING,
      });
    });
  }

  // ---- Current-day passenger state on the fixture trips ----
  const tripPassengers: TripPassengerPlan[] = [];
  for (const student of source.students) {
    const route = requireRoute(routesById, student.routeId);
    const direction = JourneyDirection.MORNING; // source journey state is the morning service
    requireFixtureTrip(trips, route.id, direction);
    tripPassengers.push({
      routeCode: route.id,
      direction,
      riderRoll: riderRollOf(student),
      status: mapJourneyStatus(student.journeyStatus),
      pickedUpAt:
        student.lastBoardedTime !== undefined
          ? serviceDateTime(parseClockToMinutes(student.lastBoardedTime))
          : null,
    });
  }
  for (const staff of source.staffPassengers) {
    const routeCode = staff.assignedRouteId;
    if (routeCode === undefined) {
      throw new Error(`Staff passenger ${staff.staffId} has no assigned route`);
    }
    const direction = mapDirection(staff.tripType);
    requireFixtureTrip(trips, routeCode, direction);
    tripPassengers.push({
      routeCode,
      direction,
      riderRoll: staff.staffId,
      status: mapJourneyStatus(staff.journeyStatus),
      pickedUpAt: null,
    });
  }

  // ---- Fees, invoices, payments (integer paisa only) ----
  const installments = [...source.installments].sort((a, b) => a.number - b.number);
  const totalFeeDefault = installments.reduce((sum, installment) => sum + installment.amount, 0);
  const finalDueDate =
    installments.length > 0
      ? parseDayMonthYear(installments[installments.length - 1].dueDate)
      : null;
  const feeDefinition: FeePlan = {
    name: 'University Transport Fee',
    term: 'Fall 2026',
    amountMinor: totalFeeDefault * 100,
  };

  const invoices: InvoicePlan[] = [];
  const payments: PaymentPlan[] = [];
  for (const student of source.students) {
    const roll = riderRollOf(student);
    const totalFee = student.totalFee ?? totalFeeDefault;
    if (totalFee !== totalFeeDefault) {
      throw new Error(
        `Student ${roll}: totalFee ${totalFee} differs from the installment plan sum ${totalFeeDefault} — source data changed, review the seed mapping`,
      );
    }
    const paid = student.feePaid ?? 0;
    const invoiceStatus: InvoiceStatus =
      student.feeStatus === 'Paid'
        ? InvoiceStatus.PAID
        : paid > 0
          ? InvoiceStatus.PARTIALLY_PAID
          : InvoiceStatus.PENDING;
    invoices.push({
      riderRoll: roll,
      amountMinor: totalFee * 100,
      status: invoiceStatus,
      dueDate: finalDueDate,
    });
    if (paid > 0) {
      // Demo payment fixture: the source records feePaid but no channel;
      // WALLET is the application's default payment channel.
      payments.push({
        riderRoll: roll,
        amountMinor: paid * 100,
        method: PaymentMethod.WALLET,
        status: PaymentStatus.SUCCEEDED,
      });
    }
  }

  return {
    riders,
    guardians: [...guardiansByPhone.values()],
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
    feeDefinition,
    invoices,
    payments,
  };
}
