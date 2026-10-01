import React, { useState } from 'react';
import {
  TransportRoute,
  Vehicle,
  Driver,
  Student,
  ActiveTrip,
  AIRecommendation,
  TripType,
} from '../types';
import { AdminCommandCenter } from '../components/AdminCommandCenter';
import { AppShell, PagePlaceholder } from '../components/shell';
import type { BottomNavItem } from '../components/ui';
import {
  LayoutDashboard,
  Bus,
  Route as RouteIcon,
  CalendarClock,
  Users,
  Sparkles,
  BarChart3,
  Settings,
  Sliders,
  CheckCheck,
} from 'lucide-react';

export type AdminPage =
  | 'overview'
  | 'fleet'
  | 'routes'
  | 'trips'
  | 'people'
  | 'viaai'
  | 'reports'
  | 'settings';

const NAV_ITEMS: BottomNavItem<AdminPage>[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'fleet', label: 'Fleet', icon: <Bus className="w-4 h-4" /> },
  { id: 'routes', label: 'Routes', icon: <RouteIcon className="w-4 h-4" /> },
  { id: 'trips', label: 'Trips', icon: <CalendarClock className="w-4 h-4" /> },
  { id: 'people', label: 'People', icon: <Users className="w-4 h-4" /> },
  { id: 'viaai', label: 'ViaAI', icon: <Sparkles className="w-4 h-4" /> },
  { id: 'reports', label: 'Reports', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
];

interface AdminAppProps {
  routes: TransportRoute[];
  vehicles: Vehicle[];
  drivers: Driver[];
  students: Student[];
  activeTrips: ActiveTrip[];
  recommendations: AIRecommendation[];
  pendingRequests: number;
  tripType: TripType;
  onToggleTripType: (type: TripType) => void;
  isSimulating: boolean;
  onToggleSimulation: () => void;
  simulationSpeed: number;
  onChangeSpeed: (speed: number) => void;
  onResetSimulation: () => void;
  onOpenDataImport: () => void;
  onOpenExtraBus: () => void;
  onOpenWhatIf: () => void;
  onOpenBatchUpdates: () => void;
  onOpenStaffModal: () => void;
  onOpenSchedulePDF: () => void;
  onSelectRecommendation: (rec: AIRecommendation) => void;
  onTriggerBreakdown: () => void;
  onAcceptRecommendation: (rec: AIRecommendation) => void;
  onRunOptimization: () => void;
}

const actionButton =
  'flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface hover:bg-surface-2 text-slate-200 border border-line hover:border-brand-500/50 text-xs font-semibold transition-colors';

/**
 * Admin shell. Uses a persistent sidebar because eight destinations cannot fit
 * a bottom bar, and the command center needs the full viewport width.
 */
export const AdminApp: React.FC<AdminAppProps> = (props) => {
  const [page, setPage] = useState<AdminPage>('overview');

  const { routes, vehicles, drivers, students, activeTrips, recommendations, pendingRequests } = props;
  const pendingRecs = recommendations.filter((r) => r.status === 'pending').length;

  const sidebarFooter = (
    <div className="space-y-2 text-[10px] font-mono">
      <div className="flex justify-between text-slate-500">
        <span>FLEET</span>
        <span className="text-brand-400">
          {activeTrips.length}/{vehicles.length} ACTIVE
        </span>
      </div>
      <div className="flex justify-between text-slate-500">
        <span>VIaAI</span>
        <span className={pendingRecs > 0 ? 'text-amber-400' : 'text-ok-400'}>
          {pendingRecs} PENDING
        </span>
      </div>
      <div className="flex justify-between text-slate-500">
        <span>REQUESTS</span>
        <span className={pendingRequests > 0 ? 'text-purple-400' : 'text-slate-400'}>
          {pendingRequests} OPEN
        </span>
      </div>
    </div>
  );

  return (
    <AppShell
      variant="sidebar"
      items={NAV_ITEMS}
      active={page}
      onNavigate={setPage}
      appLabel="Command Center"
      ariaLabel="Admin sections"
      wide
      sidebarFooter={sidebarFooter}
    >
      {page === 'overview' && (
        <AdminCommandCenter
          routes={routes}
          vehicles={vehicles}
          drivers={drivers}
          students={students}
          activeTrips={activeTrips}
          recommendations={recommendations}
          tripType={props.tripType}
          onToggleTripType={props.onToggleTripType}
          isSimulating={props.isSimulating}
          onToggleSimulation={props.onToggleSimulation}
          simulationSpeed={props.simulationSpeed}
          onChangeSpeed={props.onChangeSpeed}
          onResetSimulation={props.onResetSimulation}
          onOpenDataImport={props.onOpenDataImport}
          onOpenExtraBus={props.onOpenExtraBus}
          onOpenWhatIf={props.onOpenWhatIf}
          onOpenBatchUpdates={props.onOpenBatchUpdates}
          onOpenStaffModal={props.onOpenStaffModal}
          onOpenSchedulePDF={props.onOpenSchedulePDF}
          onSelectRecommendation={props.onSelectRecommendation}
          onTriggerBreakdown={props.onTriggerBreakdown}
          onAcceptRecommendation={props.onAcceptRecommendation}
        />
      )}

      {page === 'fleet' && (
        <PagePlaceholder
          title="Fleet Management"
          description="Vehicles, coasters and captain assignments across the active fleet."
          icon={<Bus className="w-6 h-6" />}
          planned={[
            `Inventory of ${vehicles.length} vehicles with capacity, status and fuel level`,
            'Assign or reassign a vehicle and captain to each corridor',
            'Utilization and idle-time tracking per vehicle',
            'Maintenance flags that automatically pull a bus from live dispatch',
          ]}
        />
      )}

      {page === 'routes' && (
        <PagePlaceholder
          title="Routes & Stops"
          description="Corridor definitions, stop sequencing and published timings."
          icon={<RouteIcon className="w-6 h-6" />}
          planned={[
            `Edit the ${routes.length} official corridors and their ${routes.reduce((n, r) => n + r.stops.length, 0)} stops`,
            'Reorder stop sequences and adjust inbound/return timings',
            'Set capacity limits and open or close a corridor for registration',
            'Import a revised schedule from the transport office CSV',
          ]}
          actions={
            <button type="button" onClick={props.onOpenDataImport} className={actionButton}>
              Import CSV / Excel
            </button>
          }
        />
      )}

      {page === 'trips' && (
        <PagePlaceholder
          title="Trips & Dispatch"
          description="Morning inbound and afternoon return services across all corridors."
          icon={<CalendarClock className="w-6 h-6" />}
          planned={[
            `${activeTrips.length} active trips with live position, speed and delay`,
            'On-time performance by corridor and time of day',
            'Dispatch an extra service when demand exceeds seated capacity',
            'Replay a completed trip against its published schedule',
          ]}
          actions={
            <button type="button" onClick={props.onOpenExtraBus} className={actionButton}>
              <Bus className="w-4 h-4 text-brand-400" aria-hidden="true" />
              Deploy Extra Bus
            </button>
          }
        />
      )}

      {page === 'people' && (
        <PagePlaceholder
          title="People"
          description="Registered riders, captains, faculty passes and pending change requests."
          icon={<Users className="w-6 h-6" />}
          planned={[
            `${students.length} registered riders with corridor, stop and payment status`,
            `${drivers.length} captains with licence, rating and duty status`,
            `${pendingRequests} open route or stop change requests awaiting review`,
            'Approve, reject or batch-process registration and transfer requests',
          ]}
          actions={
            <>
              <button type="button" onClick={props.onOpenBatchUpdates} className={actionButton}>
                <CheckCheck className="w-4 h-4 text-purple-400" aria-hidden="true" />
                Batch Route Updates
              </button>
              <button type="button" onClick={props.onOpenStaffModal} className={actionButton}>
                Staff Ride Pass
              </button>
            </>
          }
        />
      )}

      {page === 'viaai' && (
        <PagePlaceholder
          title="ViaAI Center"
          description="Route optimization, demand forecasting and what-if scenario planning."
          icon={<Sparkles className="w-6 h-6" />}
          planned={[
            `${pendingRecs} pending recommendations awaiting an admin decision`,
            'Rebalance corridor load between overloaded and underused buses',
            'Simulate a demand spike before committing a timetable change',
            'Consolidate nearby low-demand stops to cut travel time',
          ]}
          actions={
            <>
              <button
                type="button"
                id="btn-viaai-optimize"
                onClick={props.onRunOptimization}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-glow-brand transition-colors"
              >
                <Sparkles className="w-4 h-4" aria-hidden="true" />
                AI Optimize Routes
              </button>
              <button type="button" onClick={props.onOpenWhatIf} className={actionButton}>
                <Sliders className="w-4 h-4 text-accent-400" aria-hidden="true" />
                What-If Simulator
              </button>
            </>
          }
        />
      )}

      {page === 'reports' && (
        <PagePlaceholder
          title="Reports"
          description="Exportable summaries for the transport office and university finance."
          icon={<BarChart3 className="w-6 h-6" />}
          planned={[
            'Ridership and utilization by corridor, week and semester',
            'Fee collection against the 55,000 installment schedule',
            'On-time performance and average delay per route',
            'Export to CSV or PDF for monthly transport committee review',
          ]}
          actions={
            <button type="button" onClick={props.onOpenSchedulePDF} className={actionButton}>
              Official PDF Timetable
            </button>
          }
        />
      )}

      {page === 'settings' && (
        <PagePlaceholder
          title="Settings"
          description="Platform configuration for this campus deployment."
          icon={<Settings className="w-6 h-6" />}
          planned={[
            'Campus profile, term dates and published pickup windows',
            'Fee structure and installment due dates',
            'Capacity thresholds that trigger a ViaAI recommendation',
            'Administrator accounts and role permissions',
          ]}
        />
      )}
    </AppShell>
  );
};
