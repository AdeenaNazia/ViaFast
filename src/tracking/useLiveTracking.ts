import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TripType } from '../types';
import { freshnessForAge } from './geo';
import type {
  DataFreshness,
  TrackingInput,
  TrackingProvider,
  VehicleTracking,
} from './types';

export interface UseLiveTrackingOptions {
  /** Wall-clock tick used to age fixes and drive "updated Xs ago". Default 1000ms. */
  clockMs?: number;
}

export interface LiveTracking {
  /** Normalized, freshness-aware tracking records (identity stable between sim ticks). */
  vehicles: VehicleTracking[];
  generatedAt: number;
  tripType: TripType;
  /** Ticking wall clock (ms). Changes every `clockMs`; used for "Xs ago" text. */
  now: number;
  fleetFreshness: DataFreshness;
  byId: (vehicleId: string) => VehicleTracking | undefined;
  byRoute: (routeId: string) => VehicleTracking | undefined;
}

/** Small wall-clock ticker for "updated Xs ago" style displays. */
export function useTrackingClock(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (intervalMs <= 0) return;
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/**
 * The single entry point UI uses for live tracking. It runs a `TrackingProvider`
 * over the current app data and returns the normalized model plus freshness.
 *
 * Components depend on this hook and the `VehicleTracking` shape — never on the
 * simulation internals — so the provider can be swapped for a real GPS one
 * without any UI change.
 */
export function useLiveTracking(
  provider: TrackingProvider,
  input: TrackingInput,
  options: UseLiveTrackingOptions = {}
): LiveTracking {
  const { clockMs = 1000 } = options;
  const { routes, vehicles, activeTrips, students, tripType } = input;

  const now = useTrackingClock(clockMs);

  // Heavy work: only recompute when the underlying data actually changes.
  const snapshot = useMemo(
    () => provider.getSnapshot({ routes, vehicles, activeTrips, students, tripType }),
    [provider, routes, vehicles, activeTrips, students, tripType]
  );

  // Freshness categories change far less often than the clock ticks; keying the
  // overlay on the category string keeps `vehicles` referentially stable so the
  // (memoized) map does not re-render every second.
  const freshnessKey = snapshot.vehicles
    .map((v) => freshnessForAge(now - v.timestamp))
    .join('|');

  const tracked = useMemo(() => {
    return snapshot.vehicles.map((v) => {
      const freshness = freshnessForAge(now - v.timestamp);
      const status: VehicleTracking['status'] =
        freshness === 'OFFLINE' && v.status !== 'COMPLETED' ? 'OFFLINE' : v.status;
      return { ...v, freshness, status };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot, freshnessKey]);

  const fleetFreshness = freshnessForAge(now - snapshot.generatedAt);

  const idMap = useMemo(() => {
    const m = new Map<string, VehicleTracking>();
    tracked.forEach((v) => m.set(v.vehicleId, v));
    return m;
  }, [tracked]);

  const routeMap = useMemo(() => {
    const m = new Map<string, VehicleTracking>();
    tracked.forEach((v) => {
      if (!m.has(v.routeId)) m.set(v.routeId, v);
    });
    return m;
  }, [tracked]);

  const byId = useCallback((vehicleId: string) => idMap.get(vehicleId), [idMap]);
  const byRoute = useCallback((routeId: string) => routeMap.get(routeId), [routeMap]);

  return {
    vehicles: tracked,
    generatedAt: snapshot.generatedAt,
    tripType: snapshot.tripType,
    now,
    fleetFreshness,
    byId,
    byRoute,
  };
}

/** Vehicles serving any of the given routes (role scoping for riders/driver). */
export function selectForRoutes(
  vehicles: VehicleTracking[],
  routeIds: Array<string | undefined>
): VehicleTracking[] {
  const ids = new Set(routeIds.filter(Boolean) as string[]);
  return vehicles.filter((v) => ids.has(v.routeId));
}

/** The single vehicle serving a route, if any. */
export function selectForRoute(
  vehicles: VehicleTracking[],
  routeId: string | undefined
): VehicleTracking | undefined {
  if (!routeId) return undefined;
  return vehicles.find((v) => v.routeId === routeId);
}

export function selectVehicle(
  vehicles: VehicleTracking[],
  vehicleId: string | undefined
): VehicleTracking | undefined {
  if (!vehicleId) return undefined;
  return vehicles.find((v) => v.vehicleId === vehicleId);
}
