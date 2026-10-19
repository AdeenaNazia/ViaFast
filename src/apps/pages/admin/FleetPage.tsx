import React, { useMemo, useState } from 'react';
import { Bus, Fuel, Gauge, MapPin, Sparkles, UserCog, Wrench } from 'lucide-react';
import type { ActiveTrip, Driver, Student, TransportRoute, Vehicle } from '../../../types';
import { Card, EmptyState, ProgressIndicator, StatusBadge, Tabs } from '../../../components/ui';
import type { TabItem } from '../../../components/ui';
import { AdminPageHeader } from './AdminPageHeader';

type FleetFilter = 'all' | 'Active' | 'Maintenance' | 'Delayed' | 'Reserve';

interface FleetPageProps {
  routes: TransportRoute[];
  vehicles: Vehicle[];
  drivers: Driver[];
  students: Student[];
  activeTrips: ActiveTrip[];
  onTriggerBreakdown: () => void;
}

export const FleetPage: React.FC<FleetPageProps> = ({
  routes,
  vehicles,
  drivers,
  students,
  activeTrips,
  onTriggerBreakdown,
}) => {
  const [filter, setFilter] = useState<FleetFilter>('all');

  const counts = useMemo(
    () => ({
      all: vehicles.length,
      Active: vehicles.filter((v) => v.status === 'Active').length,
      Maintenance: vehicles.filter((v) => v.status === 'Maintenance').length,
      Delayed: vehicles.filter((v) => v.status === 'Delayed').length,
      Reserve: vehicles.filter((v) => v.status === 'Reserve').length,
    }),
    [vehicles]
  );

  const filterItems: TabItem<FleetFilter>[] = [
    { id: 'all', label: `All (${counts.all})`, domId: 'admin-fleet-filter-all' },
    { id: 'Active', label: `Active (${counts.Active})`, domId: 'admin-fleet-filter-active' },
    { id: 'Delayed', label: `Delayed (${counts.Delayed})`, domId: 'admin-fleet-filter-delayed' },
    { id: 'Maintenance', label: `Maintenance (${counts.Maintenance})`, domId: 'admin-fleet-filter-maintenance' },
    { id: 'Reserve', label: `Reserve (${counts.Reserve})`, domId: 'admin-fleet-filter-reserve' },
  ];

  const visible = vehicles.filter((v) => filter === 'all' || v.status === filter);

  const activeCount = counts.Active;
  const reserveCount = counts.Reserve;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Fleet Management"
        subtitle={`${activeCount} vehicles on corridor · ${reserveCount} in reserve · ${vehicles.length} total in the FAST Multan fleet`}
        actions={
          <button
            onClick={onTriggerBreakdown}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 hover:text-amber-200 hover:underline"
          >
            <Wrench className="w-3.5 h-3.5" />
            Simulate Breakdown Drill
          </button>
        }
      />

      <Tabs items={filterItems} value={filter} onChange={setFilter} ariaLabel="Filter fleet by status" />

      {visible.length === 0 ? (
        <EmptyState
          title="No vehicles in this state"
          message="Switch the filter to see the rest of the fleet."
          icon={<Bus className="w-6 h-6" />}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((vehicle) => {
            const route = routes.find((r) => r.id === vehicle.assignedRouteId);
            const driver = drivers.find((d) => d.id === vehicle.assignedDriverId);
            const trip = activeTrips.find((t) => t.busId === vehicle.id);
            const riders = students.filter((s) => s.routeId === route?.id).length;
            const fuel = vehicle.fuelLevel ?? 0;
            const fuelTone = fuel >= 50 ? 'ok' : fuel >= 25 ? 'warn' : 'danger';

            return (
              <Card key={vehicle.id} padding="md" className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-bold text-white truncate">{vehicle.vehicleNumber}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {vehicle.type}
                      {vehicle.model ? ` · ${vehicle.model}` : ''} · {vehicle.capacity} seats
                    </p>
                  </div>
                  <StatusBadge kind="vehicle" status={vehicle.status} />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-slate-500 text-[10px] uppercase tracking-wider">Corridor</p>
                      <p className="text-slate-200 font-semibold truncate">
                        {route ? `R${route.routeNumber} · ${route.name.split(':')[0]}` : 'Unassigned'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <UserCog className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-slate-500 text-[10px] uppercase tracking-wider">Captain</p>
                      <p className="text-slate-200 font-semibold truncate">{driver?.name ?? '—'}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <Fuel className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
                  <ProgressIndicator value={fuel} tone={fuelTone} label="Fuel" showValue size="sm" />
                  {route && (
                    <span className="ml-auto font-mono text-[11px] text-slate-400 shrink-0">
                      {riders}/{vehicle.capacity} riders
                    </span>
                  )}
                </div>

                {trip ? (
                  <div className="rounded-lg border border-line bg-surface-2/50 px-3 py-2 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-[9px] uppercase tracking-widest text-slate-500">Speed</p>
                      <p className="font-mono text-sm font-bold text-cyan-300 flex items-center justify-center gap-1">
                        <Gauge className="w-3 h-3" aria-hidden="true" />
                        {trip.speedKmh}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-widest text-slate-500">Delay</p>
                      <p
                        className={`font-mono text-sm font-bold ${
                          trip.delayMinutes > 3 ? 'text-rose-400' : 'text-ok-400'
                        }`}
                      >
                        {trip.delayMinutes > 0 ? `+${trip.delayMinutes}m` : '0m'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-widest text-slate-500">Progress</p>
                      <p className="font-mono text-sm font-bold text-slate-200">{trip.progressPercent}%</p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-line px-3 py-2 flex items-center gap-2 text-xs text-slate-400">
                    {vehicle.status === 'Reserve' ? (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" aria-hidden="true" />
                        Standing by on campus — available for surge or emergency dispatch.
                      </>
                    ) : vehicle.status === 'Maintenance' ? (
                      <>
                        <Wrench className="w-3.5 h-3.5 text-rose-400" aria-hidden="true" />
                        In the workshop — corridor operations are covered by substitutes.
                      </>
                    ) : (
                      <>No live trip in progress for this vehicle.</>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
