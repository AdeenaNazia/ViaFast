// Unit tests for the pure transformation layer. Fixtures mirror the shape of
// src/data/initialData.ts (see ./source.ts) but are minimal and local — the
// real source file is exercised by `npm run db:seed -- --dry-run`.

import {
  DriverStatus,
  InvoiceStatus,
  JourneyDirection,
  PassengerTripStatus,
  PaymentMethod,
  RiderType,
  TripStatus,
  TripStopStatus,
  UserStatus,
  VehicleStatus,
} from '@prisma/client';
import { SourceData } from './source';
import { seedServiceDate, serviceDateTime } from './time';
import { stopKeyOf, transformSource } from './transform';

function makeSource(): SourceData {
  return {
    routes: [
      {
        id: 'route-a',
        routeNumber: 1,
        name: 'Route A: Test Corridor',
        direction: 'Inbound to Campus',
        busId: 'veh-a',
        driverId: 'drv-a',
        totalDistanceKm: 5,
        status: 'On Time',
        color: '#06b6d4',
        morningStartTime: '7:15 AM',
        campusArrivalTime: '8:25 AM',
        stops: [
          {
            id: 'sa1',
            sequence: 1,
            name: 'Alpha Chowk',
            morningTime: '7:15 AM',
            returnTime: '3:40 PM',
            lat: 30.1,
            lng: 71.1,
            demand: 2,
            distanceKm: 0,
          },
          {
            id: 'sa2',
            sequence: 2,
            name: 'Campus',
            morningTime: '8:25 AM',
            returnTime: '3:30 PM',
            lat: 30.2,
            lng: 71.2,
            demand: 0,
            distanceKm: 5,
          },
        ],
      },
      {
        id: 'route-b',
        routeNumber: 2,
        name: 'Route B: Second Corridor',
        direction: 'Inbound to Campus',
        busId: 'veh-b',
        driverId: 'drv-b',
        totalDistanceKm: 2,
        status: 'On Time',
        color: '#3b82f6',
        morningStartTime: '7:20 AM',
        campusArrivalTime: '8:25 AM',
        stops: [
          // identical name + coordinates as route-a's first stop → deduplicated
          {
            id: 'sb1',
            sequence: 1,
            name: 'Alpha Chowk',
            morningTime: '7:20 AM',
            returnTime: '3:45 PM',
            lat: 30.1,
            lng: 71.1,
            demand: 1,
            distanceKm: 0,
          },
          // same name as above, different coordinates → stays distinct
          {
            id: 'sb2',
            sequence: 2,
            name: 'Alpha Chowk',
            morningTime: '7:25 AM',
            returnTime: '3:50 PM',
            lat: 30.3,
            lng: 71.3,
            demand: 1,
            distanceKm: 2,
          },
        ],
      },
    ],
    vehicles: [
      {
        id: 'veh-a',
        vehicleNumber: 'Coaster # 1',
        type: 'Coaster',
        capacity: 30,
        assignedRouteId: 'route-a',
        assignedDriverId: 'drv-a',
        status: 'Active',
        currentLat: 30.1,
        currentLng: 71.1,
      },
      {
        id: 'veh-b',
        vehicleNumber: 'Coaster # 2',
        type: 'Coaster',
        capacity: 30,
        assignedRouteId: 'route-b',
        assignedDriverId: 'drv-b',
        status: 'Delayed',
        currentLat: 30.2,
        currentLng: 71.2,
      },
    ],
    drivers: [
      {
        id: 'drv-a',
        name: 'Zubair',
        cell: '0300-1112223',
        licenseNumber: 'MLT-PSV-1',
        status: 'On Trip',
      },
      {
        id: 'drv-b',
        name: 'Usama',
        cell: '0300-4445556',
        licenseNumber: 'MLT-PSV-2',
        status: 'Ready',
      },
    ],
    students: [
      {
        id: 'stu-1',
        studentId: '22F-3891',
        rollNumber: 'CS-2023-104',
        name: 'Sarah Ahmed',
        department: 'Computer Science',
        semester: '6th Semester',
        routeId: 'route-a',
        pickupStopId: 'sa1',
        parentName: 'Farida Ahmed',
        parentPhone: '0301-7894561',
        journeyStatus: 'On Board',
        registrationStatus: 'Active',
        feePaid: 27000,
        totalFee: 55000,
        feeStatus: 'Pending',
        lastBoardedTime: '7:20 AM',
      },
    ],
    staffPassengers: [],
    activeTrips: [
      {
        id: 'trip-1',
        routeId: 'route-a',
        busId: 'veh-a',
        driverId: 'drv-a',
        tripType: 'morning',
        status: 'In Progress',
        currentStopIndex: 0,
        startedAt: '7:15 AM',
      },
    ],
    installments: [
      {
        number: 1,
        title: 'First Installment',
        amount: 30000,
        dueDate: '15 Aug 2026',
        status: 'Paid',
      },
      {
        number: 2,
        title: 'Second Installment',
        amount: 25000,
        dueDate: '15 Nov 2026',
        status: 'Pending',
      },
    ],
  };
}

describe('transformSource: stops and routes', () => {
  it('deduplicates identical name+coordinates across routes but keeps same-name different-coordinate stops distinct', () => {
    const plan = transformSource(makeSource());
    const alphaKey = stopKeyOf('Alpha Chowk', 30.1, 71.1);
    const campusKey = stopKeyOf('Campus', 30.2, 71.2);
    const alphaVariantKey = stopKeyOf('Alpha Chowk', 30.3, 71.3);

    expect(plan.stops).toHaveLength(3);
    expect(plan.stops.map((stop) => stop.key)).toEqual([alphaKey, campusKey, alphaVariantKey]);
    expect(plan.routeStops).toHaveLength(4);
    expect(plan.routeStops.map((rs) => `${rs.routeCode}|${rs.stopKey}`)).toEqual([
      `route-a|${alphaKey}`,
      `route-a|${campusKey}`,
      `route-b|${alphaKey}`,
      `route-b|${alphaVariantKey}`,
    ]);
  });

  it('keeps source ids as external reference codes and preserves route orientation', () => {
    const plan = transformSource(makeSource());
    expect(plan.routes.map((route) => route.code)).toEqual(['route-a', 'route-b']);
    expect(plan.routes[0].description).toBe('Inbound to Campus');
    expect(plan.vehicles.map((vehicle) => vehicle.code)).toEqual(['veh-a', 'veh-b']);
    expect(plan.vehicles[0].registrationNumber).toBe('Coaster # 1');
  });

  it('throws when source stop sequences do not match array order', () => {
    const source = makeSource();
    source.routes[0].stops = [
      { ...source.routes[0].stops[0], sequence: 1 },
      { ...source.routes[0].stops[1], sequence: 3 },
    ];
    expect(() => transformSource(source)).toThrow(/breaks source ordering/);
  });

  it('derives morning and return schedules with minute departures and stop offsets', () => {
    const plan = transformSource(makeSource());
    expect(plan.schedules).toHaveLength(4); // 2 routes × 2 directions

    const morningA = plan.schedules.find(
      (schedule) =>
        schedule.routeCode === 'route-a' && schedule.direction === JourneyDirection.MORNING,
    );
    expect(morningA?.departureMinutesSinceMidnight).toBe(435); // 7:15 AM

    const returnA = plan.schedules.find(
      (schedule) =>
        schedule.routeCode === 'route-a' && schedule.direction === JourneyDirection.RETURN,
    );
    expect(returnA?.departureMinutesSinceMidnight).toBe(930); // 3:30 PM, Campus returnTime

    const campusStop = plan.routeStops.find(
      (rs) => rs.routeCode === 'route-a' && rs.sequence === 2,
    );
    expect(campusStop?.arrivalOffsetMinutes).toBe(70); // 8:25 AM − 7:15 AM
  });
});

describe('transformSource: riders, guardians, staff', () => {
  it('maps source status vocabularies onto domain enums', () => {
    const plan = transformSource(makeSource());
    expect(plan.riders[0].userStatus).toBe(UserStatus.ACTIVE);
    expect(plan.vehicles[1].status).toBe(VehicleStatus.ACTIVE); // 'Delayed' is live-trip state
    expect(plan.drivers.map((driver) => driver.status)).toEqual([
      DriverStatus.ON_DUTY,
      DriverStatus.AVAILABLE,
    ]);
    expect(plan.trips[0].status).toBe(TripStatus.ACTIVE);
    expect(plan.tripPassengers[0].status).toBe(PassengerTripStatus.PICKED_UP); // 'On Board'
  });

  it('derives rider type from isStaff and maps pending registration to INVITED', () => {
    const source = makeSource();
    source.students.push({
      id: 'stu-2',
      studentId: '22F-9999',
      rollNumber: 'EE-2022-089',
      name: 'Staff Rider',
      department: 'Electrical Engineering',
      semester: '1st Semester',
      routeId: 'route-a',
      pickupStopId: 'sa1',
      journeyStatus: 'Waiting',
      registrationStatus: 'Pending',
      isStaff: true,
    });
    const plan = transformSource(source);
    expect(plan.riders).toHaveLength(2);
    expect(plan.riders[0].riderType).toBe(RiderType.STUDENT);
    expect(plan.riders[1].riderType).toBe(RiderType.STAFF);
    expect(plan.riders[1].userStatus).toBe(UserStatus.INVITED);
    expect(plan.riders[1].guardian).toBeNull();
  });

  it('maps staff passengers to staff riders with direction-scoped assignments', () => {
    const source = makeSource();
    source.staffPassengers.push({
      id: 'emp-1',
      staffId: 'EMP-401',
      name: 'Dr. Kashif Zeeshan',
      department: 'Physics',
      pickupStop: 'Alpha Chowk',
      dropStop: 'Campus',
      tripType: 'morning',
      status: 'Approved',
      assignedRouteId: 'route-a',
      journeyStatus: 'On Board',
    });
    const plan = transformSource(source);

    const staffRider = plan.riders.find((rider) => rider.rollNumber === 'EMP-401');
    expect(staffRider?.riderType).toBe(RiderType.STAFF);
    expect(staffRider?.semester).toBeNull();

    const staffAssignment = plan.assignments.find((a) => a.riderRoll === 'EMP-401');
    expect(staffAssignment?.direction).toBe(JourneyDirection.MORNING);
    expect(staffAssignment?.stopKey).toBe(stopKeyOf('Alpha Chowk', 30.1, 71.1));

    const studentAssignment = plan.assignments.find((a) => a.riderRoll === 'CS-2023-104');
    expect(studentAssignment?.direction).toBeNull(); // registered riders use both journeys
  });

  it('deduplicates guardians by phone and links each rider once', () => {
    const source = makeSource();
    source.students.push({
      id: 'stu-2',
      studentId: '22F-8888',
      rollNumber: 'EE-2022-089',
      name: 'Hamza Tariq',
      department: 'Electrical Engineering',
      semester: '4th Semester',
      routeId: 'route-a',
      pickupStopId: 'sa1',
      parentName: 'Same Guardian',
      parentPhone: '0301-7894561', // same phone as stu-1's guardian
      journeyStatus: 'Waiting',
      registrationStatus: 'Active',
      feePaid: 0,
      totalFee: 55000,
      feeStatus: 'Pending',
    });
    const plan = transformSource(source);
    expect(plan.guardians).toHaveLength(1); // one guardian, two riders
    expect(plan.guardianships).toHaveLength(2);
    expect(plan.guardianships.every((link) => link.guardianPhone === '0301-7894561')).toBe(true);
  });
});

describe('transformSource: trip fixtures', () => {
  it('snapshots active trips as current-day fixtures with visit-order arrival state', () => {
    const plan = transformSource(makeSource());
    expect(plan.trips[0].serviceDate).toEqual(seedServiceDate());
    expect(plan.trips[0].plannedDepartureAt).toEqual(serviceDateTime(435)); // 7:15 AM
    expect(plan.trips[0].plannedArrivalAt).toEqual(serviceDateTime(505)); // 8:25 AM

    const routeAStops = plan.tripStops.filter((tripStop) => tripStop.routeCode === 'route-a');
    expect(routeAStops).toHaveLength(2);
    expect(routeAStops.map((tripStop) => tripStop.status)).toEqual([
      TripStopStatus.ARRIVED, // sequence 1 ≤ currentStopIndex 0 + 1
      TripStopStatus.PENDING,
    ]);

    const passenger = plan.tripPassengers[0];
    expect(passenger.riderRoll).toBe('CS-2023-104');
    expect(passenger.direction).toBe(JourneyDirection.MORNING);
    expect(passenger.status).toBe(PassengerTripStatus.PICKED_UP);
    expect(passenger.pickedUpAt).toEqual(serviceDateTime(440)); // 7:20 AM lastBoardedTime
  });

  it('reverses visit order and uses return timings for return-direction fixtures', () => {
    const source = makeSource();
    source.activeTrips.push({
      id: 'trip-2',
      routeId: 'route-a',
      busId: 'veh-a',
      driverId: 'drv-a',
      tripType: 'return',
      status: 'In Progress',
      currentStopIndex: 0,
      startedAt: '3:30 PM',
    });
    const plan = transformSource(source);
    const returnStops = plan.tripStops.filter(
      (tripStop) =>
        tripStop.routeCode === 'route-a' && tripStop.direction === JourneyDirection.RETURN,
    );
    expect(returnStops).toHaveLength(2);

    // Campus is visited first on the way back; Alpha Chowk second.
    const campus = returnStops.find((tripStop) => tripStop.sequence === 1);
    const alpha = returnStops.find((tripStop) => tripStop.sequence === 2);
    expect(campus?.stopKey).toBe(stopKeyOf('Campus', 30.2, 71.2));
    expect(campus?.status).toBe(TripStopStatus.ARRIVED);
    expect(campus?.plannedArrivalAt).toEqual(serviceDateTime(930)); // 3:30 PM
    expect(alpha?.stopKey).toBe(stopKeyOf('Alpha Chowk', 30.1, 71.1));
    expect(alpha?.status).toBe(TripStopStatus.PENDING);
    expect(alpha?.plannedArrivalAt).toEqual(serviceDateTime(940)); // 3:40 PM

    const returnTrip = plan.trips.find((trip) => trip.direction === JourneyDirection.RETURN);
    expect(returnTrip?.plannedDepartureAt).toEqual(serviceDateTime(930));
  });
});

describe('transformSource: fees, invoices, payments', () => {
  it('converts fees to paisa, classifies invoice status, and creates demo payments only when paid', () => {
    const source = makeSource();
    source.students.push({
      id: 'stu-2',
      studentId: '22F-8888',
      rollNumber: 'EE-2022-089',
      name: 'Hamza Tariq',
      department: 'Electrical Engineering',
      semester: '4th Semester',
      routeId: 'route-a',
      pickupStopId: 'sa1',
      parentPhone: '0300-5544332',
      journeyStatus: 'Waiting',
      registrationStatus: 'Active',
      feePaid: 55000,
      totalFee: 55000,
      feeStatus: 'Paid',
    });
    const plan = transformSource(source);

    expect(plan.feeDefinition.amountMinor).toBe(5_500_000); // PKR 55,000 → paisa
    const partiallyPaid = plan.invoices.find((invoice) => invoice.riderRoll === 'CS-2023-104');
    expect(partiallyPaid?.amountMinor).toBe(5_500_000);
    expect(partiallyPaid?.status).toBe(InvoiceStatus.PARTIALLY_PAID);
    expect(partiallyPaid?.dueDate).toEqual(new Date('2026-11-15T00:00:00.000Z')); // final installment

    const paidInvoice = plan.invoices.find((invoice) => invoice.riderRoll === 'EE-2022-089');
    expect(paidInvoice?.status).toBe(InvoiceStatus.PAID);

    expect(plan.payments).toHaveLength(2);
    expect(plan.payments[0]).toMatchObject({
      riderRoll: 'CS-2023-104',
      amountMinor: 2_700_000, // PKR 27,000 → paisa
      method: PaymentMethod.WALLET,
    });
  });

  it('creates no payment when nothing has been paid', () => {
    const source = makeSource();
    source.students[0].feePaid = 0;
    source.students[0].feeStatus = 'Pending';
    const plan = transformSource(source);
    expect(plan.payments).toHaveLength(0);
    expect(plan.invoices[0].status).toBe(InvoiceStatus.PENDING);
  });

  it('throws when a student total fee disagrees with the installment plan sum', () => {
    const source = makeSource();
    source.students[0].totalFee = 50000;
    expect(() => transformSource(source)).toThrow(/differs from the installment plan sum/);
  });
});
