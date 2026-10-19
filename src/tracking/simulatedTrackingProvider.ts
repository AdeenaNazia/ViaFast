import type { ActiveTrip, TransportRoute, Vehicle } from '../types';
import { smartEta, type EtaCalculator } from './eta';
import type {
  GeoPoint,
  StopInfo,
  TrackingInput,
  TrackingProvider,
  TrackingSnapshot,
  TrackingStatus,
  VehicleTracking,
} from './types';

/** Short marker label, e.g. "Coaster # 7101" -> "C-7101", "Bus # BA-9757" -> "B-BA-9757". */
export function vehicleShortLabel(vehicleNumber = ''): string {
  return (
    vehicleNumber
      .replace('Coaster # ', 'C-')
      .replace('Bus # ', 'B-')
      .replace('# ', '')
      .trim() || 'BUS'
  );
}

function toStopInfo(route: TransportRoute, index: number): StopInfo | null {
  const stop = route.stops[index];
  if (!stop) return null;
  return {
    id: stop.id,
    sequence: stop.sequence,
    name: stop.name,
    point: { lat: stop.lat, lng: stop.lng },
  };
}

/**
 * Operational status derived from telemetry alone. The comms-level OFFLINE state
 * is layered on by the tracking hook when the position fix goes stale, so the
 * provider stays a pure function of the trip data it is handed.
 */
export function deriveTrackingStatus(trip: ActiveTrip): TrackingStatus {
  if (trip.status === 'Completed' || trip.progressPercent >= 100) return 'COMPLETED';
  if (trip.status === 'Delayed' || trip.delayMinutes > 3) return 'DELAYED';
  if (trip.speedKmh <= 0) return 'STOPPED';
  return 'ACTIVE';
}

export interface ToTrackingOptions {
  eta?: EtaCalculator;
  occupancy?: VehicleTracking['occupancy'];
  /** Epoch ms stamped as the time of this position fix. Defaults to now. */
  now?: number;
}

/**
 * Map a single simulated trip into the normalized tracking model. Exported so a
 * role that already holds one trip (e.g. the driver) can build its own record
 * without going through the fleet-wide provider.
 */
export function toVehicleTracking(
  trip: ActiveTrip,
  route: TransportRoute,
  vehicle: Vehicle | undefined,
  options: ToTrackingOptions = {}
): VehicleTracking {
  const eta = (options.eta ?? smartEta)(trip, route);
  const now = options.now ?? Date.now();
  const lastIndex = route.stops.length - 1;
  const currentIdx = Math.min(Math.max(0, trip.currentStopIndex), lastIndex);
  const nextIdx = Math.min(currentIdx + 1, lastIndex);
  const position: GeoPoint = { lat: trip.currentLat, lng: trip.currentLng };
  const capacity = vehicle?.capacity ?? 30;

  return {
    tripId: trip.id,
    vehicleId: trip.busId,
    routeId: route.id,
    routeNumber: route.routeNumber,
    routeName: route.name,
    routeShortName: (route.name || `Route ${route.routeNumber}`).split(':')[0],
    color: route.color,
    vehicleNumber: vehicle?.vehicleNumber ?? 'Unassigned vehicle',
    vehicleLabel: vehicleShortLabel(vehicle?.vehicleNumber),
    position,
    currentStop: toStopInfo(route, currentIdx),
    nextStop: currentIdx < lastIndex ? toStopInfo(route, nextIdx) : null,
    stopsRemaining: Math.max(0, lastIndex - currentIdx),
    totalStops: route.stops.length,
    progress: trip.progressPercent,
    status: deriveTrackingStatus(trip),
    direction: trip.tripType,
    directionLabel: trip.tripType === 'return' ? 'Return from Campus' : 'Inbound to Campus',
    timestamp: now,
    freshness: 'LIVE',
    speedKmh: trip.speedKmh,
    etaMinutes: eta.etaMinutes,
    etaConfidence: eta.confidencePercent,
    distanceRemainingKm: eta.distanceRemainingKm,
    delayMinutes: trip.delayMinutes,
    trafficLevel: trip.trafficLevel,
    capacity,
    occupancy: options.occupancy,
  };
}

/**
 * Reads the existing in-app simulation (routes + vehicles + activeTrips) and
 * produces normalized tracking snapshots. This is the only place that knows the
 * simulation's shape; replacing it with a GPS-backed provider leaves every
 * consumer untouched.
 */
export class SimulatedTrackingProvider implements TrackingProvider {
  readonly kind = 'simulated';

  constructor(private readonly eta: EtaCalculator = smartEta) {}

  getSnapshot(input: TrackingInput): TrackingSnapshot {
    const { routes, vehicles, activeTrips, students, tripType } = input;
    const now = Date.now();

    const tracked = activeTrips
      .map((trip) => {
        const route = routes.find((r) => r.id === trip.routeId);
        if (!route) return null;
        const vehicle = vehicles.find((v) => v.id === trip.busId);
        const registered = students.filter((s) => s.routeId === route.id).length;
        const capacity = vehicle?.capacity ?? 30;
        const occupancy = {
          registered,
          capacity,
          percent: Math.round((registered / (capacity || 1)) * 100),
        };
        return toVehicleTracking(trip, route, vehicle, { eta: this.eta, occupancy, now });
      })
      .filter((v): v is VehicleTracking => v !== null);

    return { vehicles: tracked, generatedAt: now, tripType };
  }
}

/** Default shared instance used by the role shells. */
export const simulatedTrackingProvider = new SimulatedTrackingProvider();
