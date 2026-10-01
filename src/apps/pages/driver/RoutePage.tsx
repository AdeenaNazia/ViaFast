import React from 'react';
import { TransportRoute, ActiveTrip, Student } from '../../../types';
import { MapPin, CheckCircle2, Circle, Users } from 'lucide-react';

interface RoutePageProps {
  route: TransportRoute;
  activeTrip: ActiveTrip;
  students: Student[];
}

/**
 * Ordered stop list for the captain's assigned corridor, with progress against
 * the live trip position. Read-only — routing changes are an admin action.
 */
export const RoutePage: React.FC<RoutePageProps> = ({ route, activeTrip, students }) => {
  const currentIndex = Math.min(activeTrip.currentStopIndex, route.stops.length - 1);
  const routeStudents = students.filter((s) => s.routeId === route.id);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-white">{route.name}</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {route.stops.length} stops • {route.totalDistanceKm} km • {route.direction}
          </p>
        </div>
        <span
          className={`shrink-0 px-3 py-1.5 rounded-xl text-[10px] font-bold border ${
            activeTrip.status === 'Delayed'
              ? 'bg-amber-950/70 text-amber-300 border-amber-800/70'
              : 'bg-emerald-950/70 text-emerald-300 border-emerald-800/70'
          }`}
        >
          {activeTrip.status.toUpperCase()}
        </span>
      </header>

      <ol className="relative space-y-1">
        {route.stops.map((stop, idx) => {
          const passed = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const waiting = routeStudents.filter((s) => s.pickupStopId === stop.id).length;

          return (
            <li
              key={stop.id}
              className={`relative flex items-start gap-3 p-3.5 rounded-2xl border transition-colors ${
                isCurrent
                  ? 'bg-emerald-950/40 border-emerald-700/60'
                  : passed
                  ? 'bg-slate-950/40 border-slate-800/60 opacity-70'
                  : 'bg-slate-900/70 border-slate-800'
              }`}
            >
              <span className="shrink-0 mt-0.5" aria-hidden="true">
                {passed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : isCurrent ? (
                  <span className="block w-4 h-4 rounded-full border-2 border-emerald-400 bg-emerald-500/30 animate-pulse" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-600" />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-500">#{stop.sequence}</span>
                  <span
                    className={`text-xs font-bold truncate ${
                      isCurrent ? 'text-emerald-300' : 'text-white'
                    }`}
                  >
                    {stop.name}
                  </span>
                  {isCurrent && (
                    <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500 text-slate-950">
                      HERE
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-[10px] font-mono text-slate-400">
                  <span>Inbound {stop.morningTime}</span>
                  <span>Return {stop.returnTime}</span>
                  <span>{stop.distanceKm} km</span>
                  {waiting > 0 && (
                    <span className="inline-flex items-center gap-1 text-cyan-300">
                      <Users className="w-3 h-3" aria-hidden="true" />
                      {waiting} waiting
                    </span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
        <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
        Stop order and timings come from the official university transport schedule.
      </p>
    </div>
  );
};
