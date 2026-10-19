import React from 'react';
import { Bus, MapPin, ArrowRight, Clock, Gauge, Users, Crosshair, Navigation } from 'lucide-react';
import type { VehicleTracking } from '../../tracking/types';
import { TRACKING_STATUS_META, FRESHNESS_META } from '../../tracking/status';
import { formatSecondsAgo, secondsSince } from '../../tracking/geo';

export type TrackingPanelVariant = 'admin' | 'student' | 'parent' | 'driver';

interface VehicleTrackingPanelProps {
  tracking: VehicleTracking;
  /** Wall-clock ms from useLiveTracking()/useTrackingClock() — drives "updated Xs ago". */
  now: number;
  variant?: TrackingPanelVariant;
  /** Override the header title (defaults to the vehicle label). */
  title?: string;
  /** Label + value for the headline ETA (defaults to "ETA to campus"). */
  primaryEtaLabel?: string;
  primaryEtaMinutes?: number;
  /** Extra role-specific rows appended after the core grid. */
  extraRows?: Array<{ label: string; value: React.ReactNode }>;
  onRecenter?: () => void;
  onTrack?: () => void;
  className?: string;
}

/**
 * Reusable read-only summary of one tracked vehicle. Every role renders the same
 * core facts (vehicle, route, current/next stop, ETA, status, freshness) and
 * layers role-specific rows on top — so the panel never depends on the data
 * source, only on the `VehicleTracking` model.
 */
export const VehicleTrackingPanel: React.FC<VehicleTrackingPanelProps> = ({
  tracking,
  now,
  variant = 'admin',
  title,
  primaryEtaLabel,
  primaryEtaMinutes,
  extraRows,
  onRecenter,
  onTrack,
  className = '',
}) => {
  const status = TRACKING_STATUS_META[tracking.status];
  const fresh = FRESHNESS_META[tracking.freshness];
  const updatedAgo = formatSecondsAgo(secondsSince(tracking.timestamp, now));
  const etaLabel = primaryEtaLabel ?? (tracking.direction === 'return' ? 'ETA home' : 'ETA to campus');
  const etaMinutes = primaryEtaMinutes ?? tracking.etaMinutes;

  const rows: Array<{ label: string; value: React.ReactNode; icon?: React.ReactNode }> = [
    {
      label: 'Route',
      icon: <Navigation className="w-3.5 h-3.5 text-slate-400" />,
      value: (
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tracking.color }} />
          {tracking.routeShortName}
        </span>
      ),
    },
    {
      label: 'Current stop',
      icon: <MapPin className="w-3.5 h-3.5 text-emerald-400" />,
      value: tracking.currentStop ? (
        <span>
          #{tracking.currentStop.sequence} {tracking.currentStop.name}
        </span>
      ) : (
        <span className="text-slate-400">En route</span>
      ),
    },
    {
      label: 'Next stop',
      icon: <ArrowRight className="w-3.5 h-3.5 text-amber-400" />,
      value: tracking.nextStop ? (
        <span>
          #{tracking.nextStop.sequence} {tracking.nextStop.name}
        </span>
      ) : (
        <span className="text-purple-300">Campus terminal</span>
      ),
    },
    {
      label: 'Speed',
      icon: <Gauge className="w-3.5 h-3.5 text-cyan-400" />,
      value: <span className="font-mono">{tracking.speedKmh} km/h</span>,
    },
  ];

  if (tracking.occupancy) {
    rows.push({
      label: 'Occupancy',
      icon: <Users className="w-3.5 h-3.5 text-slate-400" />,
      value: (
        <span className="font-mono">
          {tracking.occupancy.registered}/{tracking.occupancy.capacity}
        </span>
      ),
    });
  }

  if (variant === 'driver' || variant === 'admin') {
    rows.push({
      label: 'Stops left',
      value: <span className="font-mono">{tracking.stopsRemaining} of {tracking.totalStops}</span>,
    });
  }

  const allRows = extraRows ? [...rows, ...extraRows.map((r) => ({ ...r, icon: undefined }))] : rows;

  return (
    <div className={`bg-[#0f172a] border border-slate-800 rounded-2xl shadow-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-4 border-b border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
            style={{ backgroundColor: `${tracking.color}1a`, borderColor: `${tracking.color}66` }}
          >
            <Bus className="w-5 h-5" style={{ color: tracking.color }} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white truncate">{title ?? tracking.vehicleLabel}</h3>
            <p className="text-[11px] text-slate-400 truncate">
              {tracking.vehicleNumber} • {tracking.directionLabel}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${status.chipClass}`}>
            {status.short}
          </span>
          <span className={`flex items-center gap-1 text-[10px] font-mono ${fresh.dotClass.replace('bg-', 'text-')}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${fresh.dotClass}`} />
            {updatedAgo}
          </span>
        </div>
      </div>

      {/* ETA headline */}
      <div className="grid grid-cols-2 gap-px bg-slate-800">
        <div className="bg-[#0f172a] p-3">
          <span className="text-[10px] uppercase font-mono text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3" /> {etaLabel}
          </span>
          <span className="text-xl font-black text-emerald-400 font-mono mt-0.5 block">
            {etaMinutes}
            <span className="text-xs font-semibold text-slate-400 ml-1">min</span>
          </span>
        </div>
        <div className="bg-[#0f172a] p-3">
          <span className="text-[10px] uppercase font-mono text-slate-500">Progress</span>
          <span className="text-xl font-black text-cyan-400 font-mono mt-0.5 block">
            {Math.round(tracking.progress)}
            <span className="text-xs font-semibold text-slate-400 ml-1">%</span>
          </span>
        </div>
      </div>

      {/* Rows */}
      <div className="p-3 space-y-2">
        {allRows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-slate-400 shrink-0">
              {row.icon}
              {row.label}
            </span>
            <span className="text-slate-200 font-medium text-right truncate">{row.value}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      {(onRecenter || onTrack) && (
        <div className="flex items-center gap-2 p-3 pt-0">
          {onTrack && (
            <button
              type="button"
              onClick={onTrack}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow"
            >
              <Navigation className="w-4 h-4" />
              Track My Bus
            </button>
          )}
          {onRecenter && (
            <button
              type="button"
              onClick={onRecenter}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors"
            >
              <Crosshair className="w-4 h-4" />
              Recenter
            </button>
          )}
        </div>
      )}
    </div>
  );
};
