import React, { useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  Bus,
  CheckCircle2,
  ChevronRight,
  Clock,
  Gauge,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import type {
  ActiveTrip,
  AIRecommendation,
  Driver,
  Student,
  TransportNotification,
  TransportRoute,
  TripType,
  Vehicle,
} from '../../../types';
import { LiveMobilityMap } from '../../../components/LiveMobilityMap';
import { Button, Card, MetricCard, ProgressIndicator, SectionHeader, StatusBadge } from '../../../components/ui';
import { calculateCapacityMetrics } from '../../../utils/aiEngines';
import { AdminPageHeader } from './AdminPageHeader';
import type { AdminPage } from '../../AdminApp';

type AttentionSeverity = 'danger' | 'warning' | 'info';

interface AttentionItem {
  id: string;
  severity: AttentionSeverity;
  icon: LucideIcon;
  title: string;
  detail: string;
  actionLabel: string;
  onAction: () => void;
}

interface OverviewPageProps {
  routes: TransportRoute[];
  vehicles: Vehicle[];
  drivers: Driver[];
  students: Student[];
  activeTrips: ActiveTrip[];
  recommendations: AIRecommendation[];
  notifications: TransportNotification[];
  tripType: TripType;
  onToggleTripType: (type: TripType) => void;
  isSimulating: boolean;
  onToggleSimulation: () => void;
  simulationSpeed: number;
  onChangeSpeed: (speed: number) => void;
  onResetSimulation: () => void;
  onRunOptimization: () => void;
  onNavigate: (page: AdminPage) => void;
}

const severityStyles: Record<AttentionSeverity, { box: string; icon: string }> = {
  danger: { box: 'bg-rose-950/50 border-rose-900/60', icon: 'text-rose-400' },
  warning: { box: 'bg-amber-950/50 border-amber-900/60', icon: 'text-amber-400' },
  info: { box: 'bg-cyan-950/50 border-cyan-900/60', icon: 'text-cyan-400' },
};

export const OverviewPage: React.FC<OverviewPageProps> = ({
  routes,
  vehicles,
  drivers,
  students,
  activeTrips,
  recommendations,
  notifications,
  tripType,
  onToggleTripType,
  isSimulating,
  onToggleSimulation,
  simulationSpeed,
  onChangeSpeed,
  onResetSimulation,
  onRunOptimization,
  onNavigate,
}) => {
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [showHeatmap, setShowHeatmap] = useState(false);

  const activeVehicles = vehicles.filter((v) => v.status === 'Active');
  const activeCapacity = activeVehicles.reduce((acc, v) => acc + v.capacity, 0);
  const utilizationPercent = Math.round((students.length / (activeCapacity || 1)) * 100);
  const onTimeTrips = activeTrips.filter((t) => t.delayMinutes <= 3).length;
  const onTimeRate = activeTrips.length > 0 ? Math.round((onTimeTrips / activeTrips.length) * 100) : 100;
  const capacityMetrics = useMemo(
    () => calculateCapacityMetrics(routes, vehicles, students),
    [routes, vehicles, students]
  );
  const pendingRecommendations = recommendations.filter((r) => r.status === 'pending');

  const attentionItems = useMemo<AttentionItem[]>(() => {
    const items: AttentionItem[] = [];

    vehicles
      .filter((v) => v.status === 'Maintenance' || v.status === 'Delayed')
      .forEach((v) => {
        const route = routes.find((r) => r.busId === v.id);
        items.push({
          id: `veh-${v.id}`,
          severity: v.status === 'Maintenance' ? 'danger' : 'warning',
          icon: v.status === 'Maintenance' ? AlertTriangle : Bus,
          title: `${v.vehicleNumber} is ${v.status === 'Maintenance' ? 'in maintenance' : 'flagged delayed'}`,
          detail: route
            ? `Assigned to ${route.name.split(':')[0]} — corridor needs a substitute or schedule buffer.`
            : 'Not currently assigned to a corridor.',
          actionLabel: 'View fleet',
          onAction: () => onNavigate('fleet'),
        });
      });

    activeTrips
      .filter((t) => t.delayMinutes >= 5)
      .forEach((t) => {
        const route = routes.find((r) => r.id === t.routeId);
        items.push({
          id: `delay-${t.id}`,
          severity: 'warning',
          icon: Clock,
          title: `${(route?.name || 'Corridor').split(':')[0]} running ${t.delayMinutes} min behind`,
          detail: `Traffic ${t.trafficLevel.toLowerCase()} at ${t.speedKmh} km/h — ${t.progressPercent}% of the corridor completed.`,
          actionLabel: 'View trips',
          onAction: () => onNavigate('trips'),
        });
      });

    capacityMetrics
      .filter((m) => m.isOverloadRisk)
      .forEach((m) => {
        items.push({
          id: `cap-${m.routeId}`,
          severity: 'warning',
          icon: TrendingUp,
          title: `${m.routeName.split(':')[0]} at ${m.utilizationPercent}% capacity`,
          detail: `${m.registeredCount} riders registered for ${m.vehicleCapacity} seats — only ${m.unusedSeats} free.`,
          actionLabel: 'View routes',
          onAction: () => onNavigate('routes'),
        });
      });

    notifications
      .filter((n) => n.type === 'emergency' && n.targetRole === 'admin' && !n.read)
      .forEach((n) => {
        items.push({
          id: `notif-${n.id}`,
          severity: 'danger',
          icon: AlertTriangle,
          title: n.title,
          detail: n.message,
          actionLabel: 'Review',
          onAction: () => onNavigate('trips'),
        });
      });

    if (pendingRecommendations.length > 0) {
      items.push({
        id: 'viaai-pending',
        severity: 'info',
        icon: Sparkles,
        title: `${pendingRecommendations.length} ViaAI ${pendingRecommendations.length === 1 ? 'recommendation' : 'recommendations'} awaiting review`,
        detail: 'Heuristic analysis of fleet load and delays has produced actionable suggestions.',
        actionLabel: 'Open ViaAI',
        onAction: () => onNavigate('viaai'),
      });
    }

    return items;
  }, [vehicles, routes, activeTrips, capacityMetrics, notifications, pendingRecommendations.length, onNavigate]);

  const fleetHealthy = activeVehicles.length === vehicles.filter((v) => v.status !== 'Reserve').length;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Operations Overview"
        subtitle={`${activeTrips.length} buses in motion · ${tripType === 'morning' ? 'Morning' : 'Return'} service · ${students.length} registered riders`}
        actions={
          <Button variant="primary" size="sm" icon={<Sparkles className="w-4 h-4" />} onClick={onRunOptimization}>
            Run ViaAI Analysis
          </Button>
        }
      />

      {/* Top-level metrics */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <MetricCard
          label="Active Fleet"
          value={`${activeVehicles.length}/${vehicles.filter((v) => v.status !== 'Reserve').length}`}
          hint={`+${vehicles.filter((v) => v.status === 'Reserve').length} in reserve`}
          icon={<Bus className="w-5 h-5" />}
          tone={fleetHealthy ? 'ok' : 'warn'}
        />
        <MetricCard
          label="Fleet Utilization"
          value={`${utilizationPercent}%`}
          hint={`${students.length} riders / ${activeCapacity} seats`}
          icon={<Gauge className="w-5 h-5" />}
          tone={utilizationPercent >= 85 ? 'warn' : 'brand'}
        />
        <MetricCard
          label="On-Time Rate"
          value={`${onTimeRate}%`}
          hint={`${onTimeTrips}/${activeTrips.length} trips within buffer`}
          icon={<CheckCircle2 className="w-5 h-5" />}
          tone={onTimeRate >= 90 ? 'ok' : onTimeRate >= 75 ? 'warn' : 'danger'}
        />
        <MetricCard
          label="Active Alerts"
          value={String(attentionItems.length)}
          hint={attentionItems.length === 0 ? 'No open incidents' : 'Items below need a decision'}
          icon={<AlertTriangle className="w-5 h-5" />}
          tone={attentionItems.length === 0 ? 'ok' : 'danger'}
        />
      </div>

      {/* Attention required */}
      <Card padding="md">
        <SectionHeader
          title="Attention Required"
          subtitle={
            attentionItems.length === 0
              ? 'Every corridor is operating within normal parameters.'
              : 'The most important open issues across the fleet.'
          }
          icon={<AlertTriangle className="w-4 h-4" />}
        />
        {attentionItems.length === 0 ? (
          <div className="flex items-center gap-3 rounded-xl border border-ok-500/30 bg-ok-500/10 px-4 py-3">
            <CheckCircle2 className="w-5 h-5 text-ok-400 shrink-0" />
            <p className="text-sm font-semibold text-ok-300">
              All systems nominal — no breakdowns, delays, or capacity warnings.
            </p>
          </div>
        ) : (
          <ul className="grid gap-2 lg:grid-cols-2">
            {attentionItems.map((item) => {
              const style = severityStyles[item.severity];
              const Icon = item.icon;
              return (
                <li
                  key={item.id}
                  className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 ${style.box}`}
                >
                  <span
                    className={`mt-0.5 p-1.5 rounded-lg bg-black/30 border border-white/5 ${style.icon}`}
                    aria-hidden="true"
                  >
                    <Icon className="w-4 h-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-100 leading-snug">{item.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{item.detail}</p>
                  </div>
                  <button
                    onClick={item.onAction}
                    className={`shrink-0 inline-flex items-center gap-1 text-xs font-bold ${style.icon} hover:underline`}
                  >
                    {item.actionLabel}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* Live fleet map */}
      <Card padding="none" className="overflow-hidden">
        <LiveMobilityMap
          routes={routes}
          vehicles={vehicles}
          activeTrips={activeTrips}
          selectedRouteId={selectedRouteId}
          onSelectRoute={(id) => setSelectedRouteId(id)}
          tripType={tripType}
          onToggleTripType={onToggleTripType}
          isSimulating={isSimulating}
          onToggleSimulation={onToggleSimulation}
          simulationSpeed={simulationSpeed}
          onChangeSpeed={onChangeSpeed}
          onResetSimulation={onResetSimulation}
          showHeatmap={showHeatmap}
          onToggleHeatmap={() => setShowHeatmap((prev) => !prev)}
          onTimeRatePercent={onTimeRate}
        />
      </Card>

      {/* Corridor snapshot */}
      <Card padding="none">
        <div className="px-4 pt-4">
          <SectionHeader
            title="Corridor Snapshot"
            subtitle="Click a corridor to isolate it on the live map."
            icon={<Bus className="w-4 h-4" />}
          />
        </div>
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-line">
                <th className="px-4 py-2 font-semibold">Corridor</th>
                <th className="px-4 py-2 font-semibold">Vehicle</th>
                <th className="px-4 py-2 font-semibold">Captain</th>
                <th className="px-4 py-2 font-semibold text-right">Riders</th>
                <th className="px-4 py-2 font-semibold w-48">Utilization</th>
                <th className="px-4 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {capacityMetrics.map((m) => {
                const route = routes.find((r) => r.id === m.routeId);
                if (!route) return null;
                const vehicle = vehicles.find((v) => v.id === route.busId);
                const driver = drivers.find((d) => d.id === route.driverId);
                const selected = selectedRouteId === route.id;
                return (
                  <tr
                    key={m.routeId}
                    onClick={() => setSelectedRouteId((cur) => (cur === route.id ? '' : route.id))}
                    className={`cursor-pointer border-b border-line/50 transition-colors ${
                      selected ? 'bg-brand-600/10' : 'hover:bg-surface-2/60'
                    }`}
                  >
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: route.color }}
                          aria-hidden="true"
                        />
                        <span className="font-mono text-xs font-bold text-slate-400">R{route.routeNumber}</span>
                        <span className="font-semibold text-slate-200 truncate max-w-[220px]">
                          {route.name.split(':')[0]}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs font-mono text-slate-300">
                      {vehicle?.vehicleNumber ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-300">{driver?.name ?? '—'}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-slate-200">
                      {m.registeredCount}/{m.vehicleCapacity}
                    </td>
                    <td className="px-4 py-2.5">
                      <ProgressIndicator
                        value={m.utilizationPercent}
                        tone={m.utilizationPercent >= 85 ? 'danger' : m.utilizationPercent >= 70 ? 'warn' : 'ok'}
                        showValue
                        size="sm"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge kind="route" status={route.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
