import React, { useState } from 'react';
import {
  Student,
  TransportRoute,
  Vehicle,
  Driver,
  ActiveTrip,
  JourneyStatus,
  RouteChangeRequest,
  TripType,
  TransportHistoryItem,
  PaymentInstallment,
  TransportNotification,
} from '../types';
import { calculateSmartETA } from '../utils/aiEngines';
import { AppShell } from '../components/shell';
import type { BottomNavItem } from '../components/ui';
import { StatusBadge } from '../components/ui';
import { TrackPage } from './pages/TrackPage';
import { MyRidePage, type Occupancy } from './pages/student/MyRidePage';
import { StudentPassPage } from './pages/student/PassPage';
import { TripsPage } from './pages/student/TripsPage';
import { MorePage } from './pages/student/MorePage';
import { Home, MapPinned, QrCode, History, MoreHorizontal, MapPin, Navigation } from 'lucide-react';

export type StudentPage = 'home' | 'track' | 'pass' | 'trips' | 'more';

const NAV_ITEMS: BottomNavItem<StudentPage>[] = [
  { id: 'home', label: 'Home', icon: <Home className="w-5 h-5" /> },
  { id: 'track', label: 'Track', icon: <MapPinned className="w-5 h-5" /> },
  { id: 'pass', label: 'Pass', icon: <QrCode className="w-5 h-5" /> },
  { id: 'trips', label: 'Trips', icon: <History className="w-5 h-5" /> },
  { id: 'more', label: 'More', icon: <MoreHorizontal className="w-5 h-5" /> },
];

interface StudentAppProps {
  student: Student;
  route: TransportRoute;
  vehicle: Vehicle;
  driver: Driver;
  activeTrip: ActiveTrip;
  onUpdateJourneyStatus: (status: JourneyStatus) => void;
  onRequestRouteChange: (request: Partial<RouteChangeRequest>) => void;
  onPayFee: (studentId: string) => void;
  onOpenPaymentModal: () => void;
  onOpenNotifications: () => void;
  /** Fleet-wide data for the Track page and occupancy. */
  students: Student[];
  routes: TransportRoute[];
  vehicles: Vehicle[];
  activeTrips: ActiveTrip[];
  tripType: TripType;
  onToggleTripType: (type: TripType) => void;
  isSimulating: boolean;
  onToggleSimulation: () => void;
  simulationSpeed: number;
  onChangeSpeed: (speed: number) => void;
  onResetSimulation: () => void;
  history: TransportHistoryItem[];
  installments: PaymentInstallment[];
  notifications: TransportNotification[];
}

export const StudentApp: React.FC<StudentAppProps> = (props) => {
  const [page, setPage] = useState<StudentPage>('home');

  const {
    student,
    route,
    vehicle,
    driver,
    activeTrip,
    students,
    routes,
    vehicles,
    activeTrips,
    history,
    installments,
    notifications,
  } = props;

  const stopIndex = route.stops.findIndex((s) => s.id === student.pickupStopId);
  const pickupStop = route.stops[stopIndex] || route.stops[0];
  const eta = calculateSmartETA(activeTrip, route, stopIndex >= 0 ? stopIndex : undefined);

  const registered = students.filter((s) => s.routeId === route.id).length;
  const capacity = vehicle.capacity || 30;
  const percent = Math.round((registered / capacity) * 100);
  const occupancy: Occupancy = {
    registered,
    capacity,
    percent,
    label: percent >= 90 ? 'Nearly full' : percent >= 70 ? 'Getting busy' : 'Seats available',
    tone: percent >= 90 ? 'danger' : percent >= 70 ? 'warn' : 'ok',
  };

  const unread = notifications.filter((n) => !n.read).length;
  const alerts = notifications.slice(0, 2);

  const trackTopSlot = (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-line bg-surface p-3 shadow-xl">
      <div className="flex items-center gap-3 min-w-0">
        <div className="text-center shrink-0">
          <div className="text-2xl font-black font-mono text-brand-300 leading-none">
            {eta.etaMinutes}
            <span className="text-xs text-slate-400 ml-1">min</span>
          </div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-1">ETA</div>
        </div>
        <div className="h-9 w-px bg-line shrink-0" />
        <div className="text-xs text-slate-300 space-y-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <MapPin className="w-3.5 h-3.5 text-accent-400 shrink-0" aria-hidden="true" />
            <span className="truncate">{pickupStop.name}</span>
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <Navigation className="w-3.5 h-3.5 text-brand-400 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {eta.distanceRemainingKm} km · Next {eta.nextStopName}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <StatusBadge kind="route" status={route.status} size="sm" />
        <span
          className={`text-[11px] font-bold ${
            occupancy.tone === 'danger'
              ? 'text-danger-400'
              : occupancy.tone === 'warn'
                ? 'text-warn-400'
                : 'text-ok-400'
          }`}
        >
          {occupancy.label}
        </span>
      </div>
    </div>
  );

  return (
    <AppShell
      variant="top-nav"
      items={NAV_ITEMS}
      active={page}
      onNavigate={setPage}
      appLabel="Student"
      ariaLabel="Student sections"
    >
      {page === 'home' && (
        <MyRidePage
          student={student}
          route={route}
          vehicle={vehicle}
          pickupStop={pickupStop}
          eta={eta}
          tripType={props.tripType}
          onToggleTripType={props.onToggleTripType}
          occupancy={occupancy}
          alerts={alerts}
          unreadCount={unread}
          onUpdateJourneyStatus={props.onUpdateJourneyStatus}
          onTrackBus={() => setPage('track')}
          onViewPass={() => setPage('pass')}
          onOpenNotifications={props.onOpenNotifications}
        />
      )}

      {page === 'track' && (
        <TrackPage
          routes={routes}
          vehicles={vehicles}
          activeTrips={activeTrips}
          focusRouteId={route.id}
          highlightedBusId={vehicle.id}
          heading="Track My Bus"
          subheading={`Live position of ${vehicle.vehicleNumber} on ${route.name.split(':')[0]}.`}
          topSlot={trackTopSlot}
          tripType={props.tripType}
          onToggleTripType={props.onToggleTripType}
          isSimulating={props.isSimulating}
          onToggleSimulation={props.onToggleSimulation}
          simulationSpeed={props.simulationSpeed}
          onChangeSpeed={props.onChangeSpeed}
          onResetSimulation={props.onResetSimulation}
        />
      )}

      {page === 'pass' && (
        <StudentPassPage student={student} route={route} vehicle={vehicle} pickupStop={pickupStop} />
      )}

      {page === 'trips' && <TripsPage history={history} />}

      {page === 'more' && (
        <MorePage
          student={student}
          route={route}
          driver={driver}
          installments={installments}
          unreadNotifications={unread}
          onOpenPaymentModal={props.onOpenPaymentModal}
          onOpenNotifications={props.onOpenNotifications}
          onRequestRouteChange={props.onRequestRouteChange}
        />
      )}
    </AppShell>
  );
};
