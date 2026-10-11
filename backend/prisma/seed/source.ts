// Structural contract for the frontend seed data consumed by this importer.
// The authoritative source module is src/data/initialData.ts at the repository
// root; it is loaded at runtime (not typechecked here) so the backend stays
// decoupled from frontend compiler settings. Only the fields the seed
// consumes are declared; UI-only fields (avatars, colors) are ignored.

export interface SourceRouteStop {
  id: string;
  sequence: number;
  name: string;
  morningTime: string;
  returnTime: string;
  lat: number;
  lng: number;
  demand: number;
  distanceKm: number;
}

export interface SourceRoute {
  id: string;
  routeNumber: number;
  name: string;
  direction: string;
  busId: string;
  driverId: string;
  stops: SourceRouteStop[];
  totalDistanceKm: number;
  status: string;
  color: string;
  morningStartTime: string;
  campusArrivalTime: string;
}

export interface SourceVehicle {
  id: string;
  vehicleNumber: string;
  type: string;
  capacity: number;
  assignedRouteId: string;
  assignedDriverId: string;
  status: string;
  currentLat: number;
  currentLng: number;
}

export interface SourceDriver {
  id: string;
  name: string;
  cell: string;
  licenseNumber: string;
  status: string;
}

export interface SourceStudent {
  id: string;
  studentId: string;
  rollNumber?: string;
  name: string;
  department: string;
  semester: string | number;
  routeId: string;
  pickupStopId: string;
  parentName?: string;
  parentPhone?: string;
  journeyStatus: string;
  registrationStatus: string;
  feePaid?: number;
  totalFee?: number;
  feeStatus?: string;
  lastBoardedTime?: string;
  isStaff?: boolean;
}

export interface SourceStaffPassenger {
  id: string;
  staffId: string;
  name: string;
  department: string;
  pickupStop: string;
  dropStop: string;
  tripType: string;
  status: string;
  assignedRouteId?: string;
  journeyStatus: string;
}

export interface SourceActiveTrip {
  id: string;
  routeId: string;
  busId: string;
  driverId: string;
  tripType: string;
  status: string;
  currentStopIndex: number;
  startedAt: string;
}

export interface SourceInstallment {
  number: number;
  title: string;
  amount: number;
  dueDate: string;
  status: string;
}

export interface SourceData {
  routes: SourceRoute[];
  vehicles: SourceVehicle[];
  drivers: SourceDriver[];
  students: SourceStudent[];
  staffPassengers: SourceStaffPassenger[];
  activeTrips: SourceActiveTrip[];
  installments: SourceInstallment[];
}

const REQUIRED_EXPORTS = [
  'INITIAL_ROUTES',
  'INITIAL_VEHICLES',
  'INITIAL_DRIVERS',
  'INITIAL_STUDENTS',
  'INITIAL_STAFF_PASSENGERS',
  'INITIAL_ACTIVE_TRIPS',
  'SEMESTER_INSTALLMENTS',
] as const;

export function loadSourceData(): SourceData {
  // Non-literal specifier keeps the frontend module outside backend typecheck;
  // tsx transpiles it (and its type-only imports) on the fly at seed runtime.
  const initialDataModulePath = '../../../src/data/initialData';
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require(initialDataModulePath) as Record<string, unknown>;

  for (const exportName of REQUIRED_EXPORTS) {
    if (!Array.isArray(mod[exportName])) {
      throw new Error(
        `src/data/initialData.ts is missing export "${exportName}" (or it is not an array)`,
      );
    }
  }

  return {
    routes: mod.INITIAL_ROUTES as SourceRoute[],
    vehicles: mod.INITIAL_VEHICLES as SourceVehicle[],
    drivers: mod.INITIAL_DRIVERS as SourceDriver[],
    students: mod.INITIAL_STUDENTS as SourceStudent[],
    staffPassengers: mod.INITIAL_STAFF_PASSENGERS as SourceStaffPassenger[],
    activeTrips: mod.INITIAL_ACTIVE_TRIPS as SourceActiveTrip[],
    installments: mod.SEMESTER_INSTALLMENTS as SourceInstallment[],
  };
}
