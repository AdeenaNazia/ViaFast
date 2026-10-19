import React from 'react';
import { Bus, Clock, Gauge, MapPin, PlusCircle, Radio, TriangleAlert } from 'lucide-react';
import type { ActiveTrip, Driver, TransportRoute, Vehicle } from '../../../types';
import { Button, Card, EmptyState, ProgressIndicator, SectionHeader } from '../../../components/ui';
import { calculateSmartETA } from '../../../utils/aiEngines';
import { AdminPageHeader } from './AdminPageHeader';

interface TripsPageProps {
  routes: TransportRoute[];
  vehicles: Vehicle[];
  drivers: Driver[];
  activeTrips: ActiveTrip[];
  onOpenExtraBus: () => void;
}

const tripBadge: Record<ActiveTrip['status'], string> = {
  Scheduled: 'bg-slate-800 text-slate-300 border border-slate-600',
  Boarding: 'bg-amber-950 text-amber-300 border border-amber-800',
  'In Progress': 'bg-cyan-950 text-cyan-300 border border-cyan-800',
  Delayed: 'bg-rose-950 text-rose-300 border border-rose-800',
  Completed: 'bg-emerald-950 text-emerald-300 border border-emerald-800',
};

export const TripsPage: React.FC<TripsPageProps> = ({
  routes,
  vehicles,
  drivers,
  activeTrips,
  onOpenExtraBus,
}) => {
  const liveTrips = activeTrips.filter((t) => t.status !== 'Completed');
  const completedTrips = activeTrips.filter((t) => t.status === 'Completed');

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Trip Operations"
        subtitle={`${liveTrips.length} live trips · ${completedTrips.length} completed this session`}
        actions={
          <Button
            variant="primary"
            size="sm"
            icon={<PlusCircle className="w-4 h-4" />}
            onClick={onOpenExtraBus}
          >
            Deploy Extra Bus
          </Button>
        }
      />

      {liveTrips.length === 0 ? (
        <EmptyState
          title="No live trips right now"
          message="Active corridor trips will appear here with live speed, delay, and estimated arrival."
          icon={<Radio className="w-6 h-6" />}
        />
      ) : (
        <div className="space-y-3">
          {liveTrips.map((trip) => {
            const route = routes.find((r) => r.id === trip.routeId);
            const vehicle = vehicles.find((v) => v.id === trip.busId);
            const driver = drivers.find((d) => d.id === trip.driverId);
            const eta = route ? calculateSmartETA(trip, route) : null;
            const delayed = trip.delayMinutes > 3;

            return (
              <Card key={trip.id} padding="md" className="flex flex-col gap-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-9 h-9 rounded-lg flex items-center justify-center font-mono text-xs font-bold text-white shrink-0 border"
                      style={{
                        backgroundColor: `${route?.color ?? '#38bdf8'}26`,
                        borderColor: `${route?.color ?? '#38bdf8'}66`,
                      }}
                    >
                      R{route?.routeNumber ?? '?'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">
                        {route ? route.name.split(':')[0] : 'Unknown corridor'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {vehicle?.vehicleNumber ?? '—'} · {driver?.name ?? '—'} · departed {trip.startedAt}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold ${tripBadge[trip.status]}`}
                  >
                    {trip.status}
                  </span>
                </div>

                <ProgressIndicator
                  value={trip.progressPercent}
                  tone={delayed ? 'warn' : 'brand'}
                  label={`Corridor progress · stop ${trip.currentStopIndex + 1}/${route?.stops.length ?? '—'}`}
                  showValue
                  size="sm"
                />

                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  <div className="rounded-lg bg-surface-2/60 border border-line px-3 py-2">
                    <p className="text-[9px] uppercase tracking-widest text-slate-500 flex items-center gap-1">
                      <Gauge className="w-3 h-3" aria-hidden="true" /> Speed
                    </p>
                    <p className="font-mono text-sm font-bold text-cyan-300">{trip.speedKmh} km/h</p>
                  </div>
                  <div className="rounded-lg bg-surface-2/60 border border-line px-3 py-2">
                    <p className="text-[9px] uppercase tracking-widest text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" aria-hidden="true" /> Delay
                    </p>
                    <p
                      className={`font-mono text-sm font-bold ${delayed ? 'text-rose-400' : 'text-ok-400'}`}
                    >
                      {trip.delayMinutes > 0 ? `+${trip.delayMinutes}m` : 'On time'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-surface-2/60 border border-line px-3 py-2">
                    <p className="text-[9px] uppercase tracking-widest text-slate-500 flex items-center gap-1">
                      <TriangleAlert className="w-3 h-3" aria-hidden="true" /> Traffic
                    </p>
                    <p
                      className={`font-mono text-sm font-bold ${
                        trip.trafficLevel === 'Heavy'
                          ? 'text-rose-400'
                          : trip.trafficLevel === 'Moderate'
                            ? 'text-amber-400'
                            : 'text-ok-400'
                      }`}
                    >
                      {trip.trafficLevel}
                    </p>
                  </div>
                  <div className="rounded-lg bg-surface-2/60 border border-line px-3 py-2">
                    <p className="text-[9px] uppercase tracking-widest text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" aria-hidden="true" /> Next stop
                    </p>
                    <p className="text-xs font-bold text-slate-200 truncate" title={eta?.nextStopName ?? '—'}>
                      {eta?.nextStopName ?? '—'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-surface-2/60 border border-line px-3 py-2">
                    <p className="text-[9px] uppercase tracking-widest text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" aria-hidden="true" /> Est. arrival
                    </p>
                    <p className="font-mono text-sm font-bold text-slate-200">
                      {eta ? `${eta.etaMinutes}m` : '—'}
                      {eta && (
                        <span className="ml-1 text-[10px] text-slate-500 font-semibold">
                          {eta.confidencePercent}% conf.
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {eta && (
                  <p className="text-[11px] text-slate-500 leading-relaxed border-t border-line pt-2">
                    {eta.explanation} {eta.distanceRemainingKm} km remaining on this corridor.
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Card padding="md">
        <SectionHeader
          title="Completed Trips"
          subtitle="Trips that finished during this operating session."
          icon={<Bus className="w-4 h-4" />}
        />
        {completedTrips.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              title="No completed trips yet"
              message="Once a bus reaches the campus terminal its trip record will be archived here."
            />
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {completedTrips.map((trip) => {
              const route = routes.find((r) => r.id === trip.routeId);
              const vehicle = vehicles.find((v) => v.id === trip.busId);
              return (
                <li key={trip.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="font-semibold text-slate-200 truncate">
                    {route ? route.name.split(':')[0] : 'Corridor'} ·{' '}
                    <span className="font-mono text-xs text-slate-400">{vehicle?.vehicleNumber}</span>
                  </span>
                  <span className="font-mono text-xs text-slate-400 shrink-0">
                    departed {trip.startedAt} · {trip.delayMinutes > 0 ? `+${trip.delayMinutes}m delay` : 'on time'}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
};
