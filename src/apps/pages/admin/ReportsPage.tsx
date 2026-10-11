import React, { useMemo } from 'react';
import { BarChart3, Printer } from 'lucide-react';
import type { ActiveTrip, Driver, Student, TransportRoute, Vehicle } from '../../../types';
import { Button, Card, SectionHeader } from '../../../components/ui';
import { calculateCapacityMetrics } from '../../../utils/aiEngines';
import { AdminPageHeader } from './AdminPageHeader';

interface ReportsPageProps {
  routes: TransportRoute[];
  vehicles: Vehicle[];
  drivers: Driver[];
  students: Student[];
  activeTrips: ActiveTrip[];
  onOpenSchedulePDF: () => void;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  routes,
  vehicles,
  drivers,
  students,
  activeTrips,
  onOpenSchedulePDF,
}) => {
  const capacityMetrics = useMemo(
    () => calculateCapacityMetrics(routes, vehicles, students),
    [routes, vehicles, students]
  );
  const maxUtil = Math.max(100, ...capacityMetrics.map((m) => m.utilizationPercent));

  const topStops = useMemo(
    () =>
      routes
        .flatMap((route) => route.stops.map((stop) => ({ stop, route })))
        .sort((a, b) => b.stop.demand - a.stop.demand)
        .slice(0, 8),
    [routes]
  );
  const maxDemand = Math.max(1, ...topStops.map(({ stop }) => stop.demand));

  const journeyCounts = ['Waiting', 'Picked Up', 'On Board', 'Dropped Off', 'Absent'].map((status) => ({
    status,
    count: students.filter((s) => s.journeyStatus === status).length,
  }));
  const maxJourney = Math.max(1, ...journeyCounts.map((j) => j.count));

  const fleetCounts = ['Active', 'Delayed', 'Maintenance', 'Reserve'].map((status) => ({
    status,
    count: vehicles.filter((v) => v.status === status).length,
  }));

  const onTimeTrips = activeTrips.filter((t) => t.delayMinutes <= 3).length;
  const onTimeRate = activeTrips.length > 0 ? Math.round((onTimeTrips / activeTrips.length) * 100) : 100;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Reports & Analytics"
        subtitle="Derived from live session data — corridor load, stop demand, and rider flow."
        actions={
          <Button variant="primary" size="sm" icon={<Printer className="w-4 h-4" />} onClick={onOpenSchedulePDF}>
            Printable Schedule
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card padding="md">
          <SectionHeader
            title="Corridor Utilization"
            subtitle="Registered riders versus assigned vehicle capacity."
            icon={<BarChart3 className="w-4 h-4" />}
          />
          <ul className="mt-4 space-y-3">
            {capacityMetrics.map((m) => (
              <li key={m.routeId}>
                <div className="flex items-center justify-between gap-2 text-xs mb-1">
                  <span className="text-slate-300 font-semibold truncate">{m.routeName.split(':')[0]}</span>
                  <span className="font-mono text-slate-400 shrink-0">
                    {m.registeredCount}/{m.vehicleCapacity}
                  </span>
                </div>
                <div
                  className="h-2 rounded-full bg-surface-2 overflow-hidden"
                  role="img"
                  aria-label={`${m.routeName}: ${m.utilizationPercent}% utilization`}
                >
                  <div
                    className={`h-full rounded-full ${
                      m.utilizationPercent >= 85
                        ? 'bg-danger-500'
                        : m.utilizationPercent >= 70
                          ? 'bg-warn-500'
                          : 'bg-ok-500'
                    }`}
                    style={{ width: `${(m.utilizationPercent / maxUtil) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card padding="md">
          <SectionHeader
            title="Stop Demand"
            subtitle="Highest-demand pickup points across all corridors."
            icon={<BarChart3 className="w-4 h-4" />}
          />
          <ul className="mt-4 space-y-3">
            {topStops.map(({ stop, route }) => (
              <li key={stop.id}>
                <div className="flex items-center justify-between gap-2 text-xs mb-1">
                  <span className="text-slate-300 font-semibold truncate">
                    {stop.name}
                    <span className="text-slate-500 font-normal"> · R{route.routeNumber}</span>
                  </span>
                  <span className="font-mono text-slate-400 shrink-0">{stop.demand}</span>
                </div>
                <div
                  className="h-2 rounded-full bg-surface-2 overflow-hidden"
                  role="img"
                  aria-label={`${stop.name}: ${stop.demand} students`}
                >
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{ width: `${(stop.demand / maxDemand) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card padding="md">
          <SectionHeader
            title="Rider Flow"
            subtitle="Current journey status across all registered riders."
            icon={<BarChart3 className="w-4 h-4" />}
          />
          <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            {journeyCounts.map(({ status, count }) => (
              <li key={status}>
                <div className="flex items-center justify-between gap-2 text-xs mb-1">
                  <span className="text-slate-300 font-semibold">{status}</span>
                  <span className="font-mono text-slate-400">{count}</span>
                </div>
                <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent-500"
                    style={{ width: `${(count / maxJourney) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card padding="md">
          <SectionHeader
            title="Session Summary"
            subtitle="Fleet, crew, and punctuality snapshot for this operating session."
            icon={<BarChart3 className="w-4 h-4" />}
          />
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-surface-2/50 border border-line px-3 py-2.5">
              <dt className="text-[10px] uppercase tracking-widest text-slate-500">On-time rate</dt>
              <dd className="font-mono font-bold text-slate-100 mt-0.5">{onTimeRate}%</dd>
            </div>
            <div className="rounded-lg bg-surface-2/50 border border-line px-3 py-2.5">
              <dt className="text-[10px] uppercase tracking-widest text-slate-500">Live trips</dt>
              <dd className="font-mono font-bold text-slate-100 mt-0.5">{activeTrips.length}</dd>
            </div>
            <div className="rounded-lg bg-surface-2/50 border border-line px-3 py-2.5">
              <dt className="text-[10px] uppercase tracking-widest text-slate-500">Registered riders</dt>
              <dd className="font-mono font-bold text-slate-100 mt-0.5">{students.length}</dd>
            </div>
            <div className="rounded-lg bg-surface-2/50 border border-line px-3 py-2.5">
              <dt className="text-[10px] uppercase tracking-widest text-slate-500">Crew on duty</dt>
              <dd className="font-mono font-bold text-slate-100 mt-0.5">{drivers.length}</dd>
            </div>
          </dl>
          <ul className="mt-3 flex flex-wrap gap-2">
            {fleetCounts.map(({ status, count }) => (
              <li
                key={status}
                className="px-2.5 py-1 rounded-lg border border-line bg-surface-2/40 text-[11px] font-semibold text-slate-300"
              >
                {status}: <span className="font-mono font-bold">{count}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
};
