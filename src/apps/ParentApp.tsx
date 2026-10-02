import React, { useEffect, useMemo, useState } from 'react';
import {
  Student,
  TransportRoute,
  Vehicle,
  Driver,
  ActiveTrip,
  TripType,
  TransportNotification,
  TransportHistoryItem,
  PaymentInstallment,
} from '../types';
import { calculateSmartETA } from '../utils/aiEngines';
import { AppShell } from '../components/shell';
import type { BottomNavItem } from '../components/ui';
import { StatusBadge } from '../components/ui';
import { TrackPage } from './pages/TrackPage';
import { MyChildPage } from './pages/parent/MyChildPage';
import { ChildrenPage } from './pages/parent/ChildrenPage';
import { AlertsPage } from './pages/parent/AlertsPage';
import { ParentMorePage } from './pages/parent/MorePage';
import { Home, Users, MapPinned, Bell, MoreHorizontal } from 'lucide-react';

export type ParentPage = 'home' | 'children' | 'track' | 'alerts' | 'more';

const NAV_ITEMS: BottomNavItem<ParentPage>[] = [
  { id: 'home', label: 'Home', icon: <Home className="w-5 h-5" /> },
  { id: 'children', label: 'Children', icon: <Users className="w-5 h-5" /> },
  { id: 'track', label: 'Track', icon: <MapPinned className="w-5 h-5" /> },
  { id: 'alerts', label: 'Alerts', icon: <Bell className="w-5 h-5" /> },
  { id: 'more', label: 'More', icon: <MoreHorizontal className="w-5 h-5" /> },
];

interface ParentAppProps {
  student: Student;
  route: TransportRoute;
  vehicle: Vehicle;
  driver: Driver;
  activeTrip: ActiveTrip;
  onOpenPaymentModal: () => void;
  notifications: TransportNotification[];
  onMarkNotificationRead: (id: string) => void;
  /** Full fleet/roster so the guardian can switch between linked children. */
  students: Student[];
  drivers: Driver[];
  routes: TransportRoute[];
  vehicles: Vehicle[];
  activeTrips: ActiveTrip[];
  history: TransportHistoryItem[];
  installments: PaymentInstallment[];
  tripType: TripType;
  onToggleTripType: (type: TripType) => void;
  isSimulating: boolean;
  onToggleSimulation: () => void;
  simulationSpeed: number;
  onChangeSpeed: (speed: number) => void;
  onResetSimulation: () => void;
}

export const ParentApp: React.FC<ParentAppProps> = (props) => {
  const { student, route, vehicle, driver, activeTrip, notifications } = props;
  const { students, drivers, routes, vehicles, activeTrips, history, installments } = props;

  const [page, setPage] = useState<ParentPage>('home');

  // Children linked to this guardian (same registered guardian phone).
  const linkedChildren = useMemo(() => {
    const phone = student.parentPhone;
    const linked = phone ? students.filter((s) => s.parentPhone === phone) : [];
    return linked.length > 0 ? linked : [student];
  }, [students, student]);

  const [selectedChildId, setSelectedChildId] = useState(student.id);
  useEffect(() => {
    setSelectedChildId(student.id);
  }, [student.id]);

  const child = linkedChildren.find((c) => c.id === selectedChildId) || student;
  const childRoute = routes.find((r) => r.id === child.routeId) || route;
  const childVehicle = vehicles.find((v) => v.id === childRoute.busId) || vehicle;
  const childDriver = drivers.find((d) => d.id === childRoute.driverId) || driver;
  const childTrip = activeTrips.find((t) => t.routeId === childRoute.id) || activeTrip;

  const stopIndex = childRoute.stops.findIndex((s) => s.id === child.pickupStopId);
  const pickupStop = childRoute.stops[stopIndex] || childRoute.stops[0];
  const eta = calculateSmartETA(childTrip, childRoute, stopIndex >= 0 ? stopIndex : undefined);
  const campusEta = calculateSmartETA(childTrip, childRoute, childRoute.stops.length - 1);

  const isParentAlert = (n: TransportNotification) =>
    !n.targetRole || n.targetRole === 'parent' || n.targetRole === 'all';
  const parentAlerts = notifications.filter(isParentAlert);
  const unread = parentAlerts.filter((n) => !n.read).length;
  const recentAlerts = parentAlerts.slice(0, 2);

  const navItems = NAV_ITEMS.map((item) =>
    item.id === 'alerts' && unread > 0 ? { ...item, label: `Alerts (${unread})` } : item
  );

  const destination = props.tripType === 'return' ? 'home' : 'campus';
  const trackTopSlot = (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-line bg-surface p-3 shadow-xl">
      <div className="flex items-center gap-3 min-w-0">
        <img
          src={child.avatar}
          alt=""
          className="w-9 h-9 rounded-full object-cover border border-line-strong shrink-0"
        />
        <div className="min-w-0">
          <p className="text-xs font-bold text-white truncate">{child.name}</p>
          <p className="text-[11px] text-slate-400 truncate">
            {childRoute.name.split(':')[0]} • {childVehicle.vehicleNumber}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <StatusBadge kind="journey" status={child.journeyStatus} size="sm" />
        <span className="text-xs font-mono font-bold text-brand-300">
          {campusEta.etaMinutes}m to {destination}
        </span>
      </div>
    </div>
  );

  return (
    <AppShell
      variant="top-nav"
      items={navItems}
      active={page}
      onNavigate={setPage}
      appLabel="Guardian"
      ariaLabel="Guardian sections"
    >
      {page === 'home' && (
        <MyChildPage
          child={child}
          route={childRoute}
          vehicle={childVehicle}
          driver={childDriver}
          activeTrip={childTrip}
          pickupStop={pickupStop}
          eta={eta}
          campusEta={campusEta}
          tripType={props.tripType}
          onToggleTripType={props.onToggleTripType}
          children={linkedChildren}
          selectedChildId={child.id}
          onSelectChild={setSelectedChildId}
          alerts={recentAlerts}
          onTrackBus={() => setPage('track')}
          onOpenAlerts={() => setPage('alerts')}
        />
      )}

      {page === 'children' && (
        <ChildrenPage
          children={linkedChildren}
          routes={routes}
          vehicles={vehicles}
          drivers={drivers}
          selectedChildId={child.id}
          onSelectChild={setSelectedChildId}
          onTrackChild={(id) => {
            setSelectedChildId(id);
            setPage('track');
          }}
        />
      )}

      {page === 'track' && (
        <TrackPage
          routes={routes}
          vehicles={vehicles}
          activeTrips={activeTrips}
          focusRouteId={childRoute.id}
          highlightedBusId={childVehicle.id}
          heading="Track School Bus"
          subheading={`Live position of ${childVehicle.vehicleNumber} carrying ${child.name}.`}
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

      {page === 'alerts' && (
        <AlertsPage notifications={notifications} onMarkAsRead={props.onMarkNotificationRead} />
      )}

      {page === 'more' && (
        <ParentMorePage
          child={child}
          route={childRoute}
          driver={childDriver}
          history={history}
          installments={installments}
          onOpenPaymentModal={props.onOpenPaymentModal}
        />
      )}
    </AppShell>
  );
};
