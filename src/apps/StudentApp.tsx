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
import { StudentPortal } from '../components/StudentPortal';
import { AppShell } from '../components/shell';
import type { BottomNavItem } from '../components/ui';
import { TrackPage } from './pages/TrackPage';
import { StudentPassPage } from './pages/student/PassPage';
import { TripsPage } from './pages/student/TripsPage';
import { MorePage } from './pages/student/MorePage';
import { Home, MapPinned, QrCode, History, MoreHorizontal } from 'lucide-react';

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
  /** Fleet-wide data for the Track page. */
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
    routes,
    vehicles,
    activeTrips,
    history,
    installments,
    notifications,
  } = props;

  const pickupStop = route.stops.find((s) => s.id === student.pickupStopId) || route.stops[0];
  const unread = notifications.filter((n) => !n.read).length;

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
        <StudentPortal
          student={student}
          route={route}
          vehicle={vehicle}
          driver={driver}
          activeTrip={activeTrip}
          onUpdateJourneyStatus={props.onUpdateJourneyStatus}
          onRequestRouteChange={props.onRequestRouteChange}
          onPayFee={props.onPayFee}
          onOpenPaymentModal={props.onOpenPaymentModal}
          onViewPass={() => setPage('pass')}
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
          installments={installments}
          unreadNotifications={unread}
          onOpenPaymentModal={props.onOpenPaymentModal}
          onOpenNotifications={props.onOpenNotifications}
        />
      )}
    </AppShell>
  );
};
