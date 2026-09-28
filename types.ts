export type Role = 'student' | 'parent' | 'driver' | 'admin' | 'landing';

export type TripType = 'morning' | 'return';

export type StudentJourneyStatus = 'Waiting' | 'Picked Up' | 'On Board' | 'Dropped Off' | 'Absent';
export type JourneyStatus = StudentJourneyStatus;

export type RegistrationStatus = 'Pending' | 'Approved' | 'Rejected' | 'Active';

export interface RouteStop {
  id: string;
  sequence: number;
  name: string;
  morningTime: string;
  returnTime: string;
  lat: number;
  lng: number;
  demand: number; // student count at this stop
  distanceKm: number;
}

export interface TransportRoute {
  id: string;
  routeNumber: number;
  name: string;
  direction: 'Inbound to Campus' | 'Outbound from Campus';
  busId: string;
  driverId: string;
  stops: RouteStop[];
  totalDistanceKm: number;
  status: 'On Time' | 'Delayed' | 'Completed' | 'Standby';
  color: string;
  morningStartTime: string;
  campusArrivalTime: string;
}

export interface Vehicle {
  id: string;
  vehicleNumber: string; // e.g. "Coaster # 1987" or "Bus # BA-9757"
  type: 'Coaster' | 'Bus';
  capacity: number; // 30 for Coaster, 50 for Bus
  assignedRouteId: string;
  assignedDriverId: string;
  status: 'Active' | 'Maintenance' | 'Delayed' | 'Reserve';
  fuelLevel?: number;
  currentLat: number;
  currentLng: number;
  model?: string;
}

export interface Driver {
  id: string;
  name: string;
  cell: string;
  assignedVehicleId: string;
  assignedRouteId: string;
  licenseNumber: string;
  rating: number;
  status: 'On Trip' | 'Ready' | 'Off Duty' | 'Standby';
  experienceYears?: number;
  avatar?: string;
}

export interface Student {
  id: string;
  studentId: string; // e.g. "22F-3891"
  rollNumber?: string;
  name: string;
  email?: string;
  phone?: string;
  department: string;
  semester: string | number;
  routeId: string;
  pickupStopId: string;
  dropStopId?: string;
  parentName?: string;
  parentPhone?: string;
  journeyStatus: StudentJourneyStatus;
  registrationStatus: RegistrationStatus;
  feePaid?: number;
  totalFee?: number; // 55,000
  feeStatus?: 'Paid' | 'Pending';
  feeAmount?: number;
  avatar?: string;
  lastBoardedTime?: string;
  lastDroppedTime?: string;
  isStaff?: boolean;
}

export interface StaffPassenger {
  id: string;
  staffId: string;
  name: string;
  department: string;
  pickupStop: string;
  dropStop: string;
  date: string;
  tripType: TripType;
  status: 'Pending' | 'Approved' | 'Rejected';
  assignedRouteId?: string;
  reason: string;
  journeyStatus: StudentJourneyStatus;
}
export type StaffMember = StaffPassenger;

export interface TripPassenger {
  id: string;
  studentId: string;
  name: string;
  isStaff: boolean;
  pickupStop: string;
  dropStop: string;
  status: StudentJourneyStatus;
  boardingTime?: string;
  dropTime?: string;
}

export interface ActiveTrip {
  id: string;
  routeId: string;
  busId: string;
  driverId: string;
  tripType: TripType;
  status: 'Scheduled' | 'Boarding' | 'In Progress' | 'Delayed' | 'Completed';
  currentStopIndex: number;
  progressPercent: number;
  speedKmh: number;
  delayMinutes: number;
  startedAt: string;
  trafficLevel: 'Low' | 'Moderate' | 'Heavy';
  currentLat: number;
  currentLng: number;
}

export interface AIRecommendation {
  id: string;
  type: 'redistribution' | 'extra_bus' | 'breakdown_replace' | 'route_optimize' | 'delay_mitigation' | 'staff_assign';
  title: string;
  subtitle: string;
  what: string;
  why: string[];
  impactBefore: {
    label: string;
    route1Name?: string;
    route1Students?: number;
    route1Util?: number;
    route2Name?: string;
    route2Students?: number;
    route2Util?: number;
    travelTimeMin?: number;
    unusedCapacity?: number;
  };
  impactAfter: {
    label: string;
    route1Name?: string;
    route1Students?: number;
    route1Util?: number;
    route2Name?: string;
    route2Students?: number;
    route2Util?: number;
    travelTimeMin?: number;
    affectedStudents?: number;
  };
  confidence: number;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  targetRouteId?: string;
  targetBusId?: string;
  extraBusConfig?: {
    busNumber: string;
    driverName: string;
    startStop: string;
    stops: string[];
    expectedPassengers: number;
    durationMin: number;
    utilization: number;
  };
}

export interface WhatIfScenario {
  id: string;
  title: string;
  description: string;
  inputStudents?: number;
  inputTargetRouteId?: string;
  scenarioType: 'demand_spike' | 'bus_unavailable' | 'absenteeism' | 'stop_relocation' | 'custom';
}

export interface WhatIfCalculation {
  scenarioTitle: string;
  before: {
    route: string;
    students: number;
    capacity: number;
    utilizationPercent: number;
    avgTravelMin: number;
  };
  after: {
    route: string;
    students: number;
    capacity: number;
    utilizationPercent: number;
    avgTravelMin: number;
  };
  status: 'Normal' | 'Overload Warning' | 'Critical Capacity Exceeded';
  recommendation: string;
  actionOption: string;
  affectedCount: number;
}

export interface RouteChangeRequest {
  id: string;
  studentId: string;
  studentName: string;
  studentRollNumber?: string;
  currentRouteId: string;
  requestedRouteId: string;
  currentStopName: string;
  requestedStopName: string;
  requestDate: string;
  status: 'Pending' | 'AI Reviewed' | 'Approved' | 'Rejected';
  aiRecommendation?: 'Approve' | 'Review Required' | 'Reject';
  aiReason?: string;
  reason?: string;
}

export interface NotificationItem {
  id: string;
  targetRole?: 'student' | 'parent' | 'driver' | 'admin' | 'all' | string;
  title: string;
  message: string;
  timestamp: string;
  type: 'info' | 'warning' | 'success' | 'alert' | 'delay' | 'status_change' | 'emergency' | 'recommendation' | string;
  read: boolean;
}
export type TransportNotification = NotificationItem;

export interface TransportHistoryItem {
  id: string;
  date: string;
  tripType: 'Morning' | 'Return';
  route: string;
  bus: string;
  pickupStop: string;
  boardingTime: string;
  dropStop: string;
  dropTime: string;
  status: 'Picked Up' | 'Completed' | 'Absent';
  delay: string;
}

export interface PaymentInstallment {
  number: number;
  title: string;
  amount: number;
  dueDate: string;
  status: 'Paid' | 'Pending' | 'Overdue';
}
