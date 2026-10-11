import React, { useState } from 'react';
import {
  TransportRoute,
  Vehicle,
  Driver,
  Student,
  ActiveTrip,
  AIRecommendation,
  TransportNotification,
  TripType,
} from '../types';
import { AppShell } from '../components/shell';
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
} from 'lucide-react';
import { OverviewPage } from './pages/admin/OverviewPage';
import { FleetPage } from './pages/admin/FleetPage';
import { RoutesPage } from './pages/admin/RoutesPage';
import { TripsPage } from './pages/admin/TripsPage';
import { PeoplePage } from './pages/admin/PeoplePage';
import { ViaAIPage } from './pages/admin/ViaAIPage';
import { ReportsPage } from './pages/admin/ReportsPage';
import { SettingsPage } from './pages/admin/SettingsPage';

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
  notifications: TransportNotification[];
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
  onTriggerBreakdown: () => void;
  onAcceptRecommendation: (rec: AIRecommendation) => void;
  onRejectRecommendation: (rec: AIRecommendation) => void;
  onRunOptimization: () => void;
}

/**
 * Admin shell. Uses a persistent sidebar because eight destinations cannot fit
 * a bottom bar, and the operations pages need the full viewport width.
 */
export const AdminApp: React.FC<AdminAppProps> = (props) => {
  const [page, setPage] = useState<AdminPage>('overview');

  const {
    routes,
    vehicles,
    drivers,
    students,
    activeTrips,
    recommendations,
    notifications,
    pendingRequests,
  } = props;
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
        <span>VIAAI</span>
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
        <OverviewPage
          routes={routes}
          vehicles={vehicles}
          drivers={drivers}
          students={students}
          activeTrips={activeTrips}
          recommendations={recommendations}
          notifications={notifications}
          tripType={props.tripType}
          onToggleTripType={props.onToggleTripType}
          isSimulating={props.isSimulating}
          onToggleSimulation={props.onToggleSimulation}
          simulationSpeed={props.simulationSpeed}
          onChangeSpeed={props.onChangeSpeed}
          onResetSimulation={props.onResetSimulation}
          onRunOptimization={props.onRunOptimization}
          onNavigate={setPage}
        />
      )}

      {page === 'fleet' && (
        <FleetPage
          routes={routes}
          vehicles={vehicles}
          drivers={drivers}
          students={students}
          activeTrips={activeTrips}
          onTriggerBreakdown={props.onTriggerBreakdown}
        />
      )}

      {page === 'routes' && (
        <RoutesPage
          routes={routes}
          vehicles={vehicles}
          drivers={drivers}
          students={students}
          pendingRequests={pendingRequests}
          onOpenDataImport={props.onOpenDataImport}
          onOpenSchedulePDF={props.onOpenSchedulePDF}
          onOpenBatchUpdates={props.onOpenBatchUpdates}
        />
      )}

      {page === 'trips' && (
        <TripsPage
          routes={routes}
          vehicles={vehicles}
          drivers={drivers}
          activeTrips={activeTrips}
          onOpenExtraBus={props.onOpenExtraBus}
        />
      )}

      {page === 'people' && (
        <PeoplePage
          routes={routes}
          vehicles={vehicles}
          drivers={drivers}
          students={students}
          onOpenStaffModal={props.onOpenStaffModal}
        />
      )}

      {page === 'viaai' && (
        <ViaAIPage
          recommendations={recommendations}
          routes={routes}
          onAcceptRecommendation={props.onAcceptRecommendation}
          onRejectRecommendation={props.onRejectRecommendation}
          onRunOptimization={props.onRunOptimization}
          onOpenWhatIf={props.onOpenWhatIf}
        />
      )}

      {page === 'reports' && (
        <ReportsPage
          routes={routes}
          vehicles={vehicles}
          drivers={drivers}
          students={students}
          activeTrips={activeTrips}
          onOpenSchedulePDF={props.onOpenSchedulePDF}
        />
      )}

      {page === 'settings' && <SettingsPage routes={routes} />}
    </AppShell>
  );
};
