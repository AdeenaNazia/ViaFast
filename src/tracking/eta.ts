import type { ActiveTrip, TransportRoute } from '../types';
import { calculateSmartETA } from '../utils/aiEngines';

/**
 * ETA is isolated behind this interface so the tracking layer never calls the
 * concrete engine directly. Today it delegates to the existing ViaFast
 * `calculateSmartETA`; a future GPS/traffic-fed calculator can implement the
 * same signature and be injected into the provider without touching the UI.
 */
export type EtaResult = ReturnType<typeof calculateSmartETA>;

export interface EtaCalculator {
  (trip: ActiveTrip, route: TransportRoute, targetStopIndex?: number): EtaResult;
}

/** Default calculator — the unchanged ViaFast ETA engine. */
export const smartEta: EtaCalculator = calculateSmartETA;
