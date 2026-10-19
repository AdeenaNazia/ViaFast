import type { ActiveTrip, Student, TransportRoute, TripType, Vehicle } from '../types';

/**
 * Provider-agnostic tracking model.
 *
 * Everything below the UI (map, panels, role views) speaks these types only.
 * Today a `SimulatedTrackingProvider` fills them from the in-app simulation;
 * tomorrow a `RealGpsTrackingProvider` can fill the exact same shapes from a
 * GPS feed without touching a single component.
 */

/** Operational state of a tracked vehicle. */
export type TrackingStatus = 'ACTIVE' | 'STOPPED' | 'DELAYED' | 'COMPLETED' | 'OFFLINE';

/**
 * Age of the most recent position fix. The model can represent a stale or
 * offline feed even though nothing fakes a network failure today: freshness is
 * derived purely from how long ago the last fix was produced.
 */
export type DataFreshness = 'LIVE' | 'STALE' | 'OFFLINE';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface StopInfo {
  id: string;
  sequence: number;
  name: string;
  point: GeoPoint;
}

/** One vehicle's normalized live-tracking state. */
export interface VehicleTracking {
  tripId: string;
  vehicleId: string;
  routeId: string;

  // Display identity (carried so the map/panel never need raw Vehicle/Route).
  routeNumber: number;
  routeName: string;
  routeShortName: string;
  color: string;
  vehicleNumber: string;
  vehicleLabel: string;

  // Live position + route progress.
  position: GeoPoint;
  currentStop: StopInfo | null;
  nextStop: StopInfo | null;
  stopsRemaining: number;
  totalStops: number;
  progress: number; // 0..100 toward the destination

  status: TrackingStatus;
  direction: TripType;
  directionLabel: string;

  /** Epoch ms of the last position fix behind this record. */
  timestamp: number;
  /** Overlaid by the tracking hook from the wall clock; safe default LIVE. */
  freshness: DataFreshness;

  speedKmh: number;
  etaMinutes: number;
  etaConfidence: number;
  distanceRemainingKm: number;
  delayMinutes: number;
  trafficLevel: 'Low' | 'Moderate' | 'Heavy';

  capacity: number;
  occupancy?: {
    registered: number;
    capacity: number;
    percent: number;
  };
}

export interface TrackingSnapshot {
  vehicles: VehicleTracking[];
  generatedAt: number;
  tripType: TripType;
}

/** Everything a provider needs to build a snapshot from the current app data. */
export interface TrackingInput {
  routes: TransportRoute[];
  vehicles: Vehicle[];
  activeTrips: ActiveTrip[];
  students: Student[];
  tripType: TripType;
}

/**
 * The seam between "where positions come from" and "how they are shown".
 * Swap the implementation, keep the UI.
 */
export interface TrackingProvider {
  readonly kind: string;
  getSnapshot(input: TrackingInput): TrackingSnapshot;
}
