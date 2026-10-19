import type { DataFreshness, GeoPoint } from './types';

/** Great-circle distance between two coordinates, in kilometres. */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** A fix older than this is STALE; older than the offline bound is OFFLINE. */
export const FRESHNESS_STALE_MS = 20_000;
export const FRESHNESS_OFFLINE_MS = 60_000;

export function freshnessForAge(ageMs: number): DataFreshness {
  if (ageMs < FRESHNESS_STALE_MS) return 'LIVE';
  if (ageMs < FRESHNESS_OFFLINE_MS) return 'STALE';
  return 'OFFLINE';
}

export function secondsSince(timestamp: number, now: number): number {
  return Math.max(0, Math.round((now - timestamp) / 1000));
}

export function formatSecondsAgo(seconds: number): string {
  if (seconds <= 1) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest > 0 ? `${minutes}m ${rest}s ago` : `${minutes}m ago`;
}
