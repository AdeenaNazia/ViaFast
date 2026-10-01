import React, { useState } from 'react';
import {
  Student,
  TransportRoute,
  Vehicle,
  Driver,
  ActiveTrip,
  TripType,
  TransportNotification,
} from '../types';
import { ParentPortal } from '../components/ParentPortal';
import { AppShell, PagePlaceholder } from '../components/shell';
import type { BottomNavItem } from '../components/ui';
import { TrackPage } from './pages/TrackPage';
import { ChildrenPage } from './pages/parent/ChildrenPage';
import { AlertsPage } from './pages/parent/AlertsPage';
import { Home, Users, MapPinned, Bell, MoreHorizontal, Settings } from 'lucide-react';

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
}

export const ParentApp: React.FC<ParentAppProps> = (props) => {
  const [page, setPage] = useState<ParentPage>('home');

  const { student, route, vehicle, driver, activeTrip, notifications } = props;
  const unread = notifications.filter(
    (n) => !n.read && (!n.targetRole || n.targetRole === 'parent' || n.targetRole === 'all')
  ).length;

  const navItems = NAV_ITEMS.map((item) =>
    item.id === 'alerts' && unread > 0
      ? { ...item, label: `Alerts (${unread})` }
      : item
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
        <ParentPortal
          student={student}
          route={route}
          vehicle={vehicle}
          driver={driver}
          activeTrip={activeTrip}
          onOpenPaymentModal={props.onOpenPaymentModal}
        />
      )}

      {page === 'children' && (
        <ChildrenPage
          student={student}
          route={route}
          vehicle={vehicle}
          driver={driver}
          onTrackChild={() => setPage('track')}
        />
      )}

      {page === 'track' && (
        <TrackPage
          routes={props.routes}
          vehicles={props.vehicles}
          activeTrips={props.activeTrips}
          focusRouteId={route.id}
          highlightedBusId={vehicle.id}
          heading="Track School Bus"
          subheading={`Live position of ${vehicle.vehicleNumber} carrying ${student.name}.`}
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
        <PagePlaceholder
          title="Guardian Preferences"
          description="Account and alert settings for the guardian console."
          icon={<Settings className="w-6 h-6" />}
          planned={[
            'Link or unlink additional children to this guardian account',
            'Choose which journey events trigger SMS or push alerts',
            'Manage emergency contacts shown to the transport captain',
            'View and download semester fee challans and receipts',
          ]}
        />
      )}
    </AppShell>
  );
};
