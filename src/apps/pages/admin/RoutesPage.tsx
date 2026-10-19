import React, { useMemo, useState } from 'react';
import { ArrowRight, CalendarClock, Layers, Printer, Upload, Users } from 'lucide-react';
import type { Driver, Student, TransportRoute, Vehicle } from '../../../types';
import { Button, Card, ProgressIndicator, StatusBadge } from '../../../components/ui';
import { RouteStopsModal } from '../../../components/RouteStopsModal';
import { calculateCapacityMetrics } from '../../../utils/aiEngines';
import { AdminPageHeader } from './AdminPageHeader';

interface RoutesPageProps {
  routes: TransportRoute[];
  vehicles: Vehicle[];
  drivers: Driver[];
  students: Student[];
  pendingRequests: number;
  onOpenDataImport: () => void;
  onOpenSchedulePDF: () => void;
  onOpenBatchUpdates: () => void;
}

export const RoutesPage: React.FC<RoutesPageProps> = ({
  routes,
  vehicles,
  drivers,
  students,
  pendingRequests,
  onOpenDataImport,
  onOpenSchedulePDF,
  onOpenBatchUpdates,
}) => {
  const [stopsRoute, setStopsRoute] = useState<TransportRoute | null>(null);

  const capacityMetrics = useMemo(
    () => calculateCapacityMetrics(routes, vehicles, students),
    [routes, vehicles, students]
  );

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Route Management"
        subtitle={`${routes.length} active corridors · utilization, timetables, and stop-level detail`}
        actions={
          <>
            {pendingRequests > 0 && (
              <Button variant="secondary" size="sm" icon={<Users className="w-4 h-4" />} onClick={onOpenBatchUpdates}>
                Batch Updates
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold">
                  {pendingRequests}
                </span>
              </Button>
            )}
            <Button variant="secondary" size="sm" icon={<Printer className="w-4 h-4" />} onClick={onOpenSchedulePDF}>
              Printable Schedule
            </Button>
            <Button variant="primary" size="sm" icon={<Upload className="w-4 h-4" />} onClick={onOpenDataImport}>
              Import Schedule
            </Button>
          </>
        }
      />

      <div className="grid gap-3 lg:grid-cols-2">
        {routes.map((route) => {
          const metric = capacityMetrics.find((m) => m.routeId === route.id);
          const vehicle = vehicles.find((v) => v.id === route.busId);
          const driver = drivers.find((d) => d.id === route.driverId);
          const util = metric?.utilizationPercent ?? 0;
          const utilTone = util >= 85 ? 'danger' : util >= 70 ? 'warn' : 'ok';

          return (
            <Card key={route.id} padding="md" className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 min-w-0">
                  <span
                    className="mt-0.5 w-9 h-9 rounded-lg flex items-center justify-center font-mono text-xs font-bold text-white shrink-0 border"
                    style={{ backgroundColor: `${route.color}26`, borderColor: `${route.color}66` }}
                  >
                    R{route.routeNumber}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white leading-snug">{route.name.split(':')[0]}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{route.direction}</p>
                  </div>
                </div>
                <StatusBadge kind="route" status={route.status} />
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-slate-500 text-[10px] uppercase tracking-wider">Stops</p>
                  <p className="font-mono font-bold text-slate-200">{route.stops.length}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-[10px] uppercase tracking-wider">Distance</p>
                  <p className="font-mono font-bold text-slate-200">{route.totalDistanceKm} km</p>
                </div>
                <div>
                  <p className="text-slate-500 text-[10px] uppercase tracking-wider">Morning Dep.</p>
                  <p className="font-mono font-bold text-slate-200">{route.morningStartTime}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <CalendarClock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                Campus arrival {route.campusArrivalTime}
                <span className="text-slate-600">·</span>
                <span className="font-mono">{vehicle?.vehicleNumber ?? '—'}</span>
                <span className="text-slate-600">·</span>
                <span className="truncate">{driver?.name ?? '—'}</span>
              </div>

              <ProgressIndicator
                value={util}
                tone={utilTone}
                label={`Utilization · ${metric?.registeredCount ?? 0}/${metric?.vehicleCapacity ?? 0} riders`}
                showValue
                size="sm"
              />

              <div className="flex items-center justify-between gap-2 pt-1 border-t border-line">
                <span className="text-[11px] text-slate-500">
                  {metric?.unusedSeats ?? 0} free seats
                  {metric?.isOverloadRisk ? ' — overload risk' : ''}
                </span>
                <button
                  id={`admin-route-stops-${route.id}`}
                  onClick={() => setStopsRoute(route)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-brand-300 hover:text-brand-200 hover:underline"
                >
                  <Layers className="w-3.5 h-3.5" />
                  View stops
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      <RouteStopsModal
        route={stopsRoute}
        vehicle={stopsRoute ? vehicles.find((v) => v.id === stopsRoute.busId) : undefined}
        driver={stopsRoute ? drivers.find((d) => d.id === stopsRoute.driverId) : undefined}
        onClose={() => setStopsRoute(null)}
      />
    </div>
  );
};
