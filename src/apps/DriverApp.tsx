import React, { useState } from 'react';
import {
  Driver,
  TransportRoute,
  Vehicle,
  Student,
  ActiveTrip,
  JourneyStatus,
} from '../types';
import { AppShell } from '../components/shell';
import type { BottomNavItem } from '../components/ui';
import { TripPage } from './pages/driver/TripPage';
import { PassengersPage } from './pages/driver/PassengersPage';
import { RoutePage } from './pages/driver/RoutePage';
import { IncidentsPage } from './pages/driver/IncidentsPage';
import { ProfilePage } from './pages/driver/ProfilePage';
import { Navigation, Users, Route as RouteIcon, AlertTriangle, UserCircle } from 'lucide-react';

export type DriverPage = 'trip' | 'passengers' | 'route' | 'incidents' | 'profile';

const NAV_ITEMS: BottomNavItem<DriverPage>[] = [
  { id: 'trip', label: 'Current Trip', icon: <Navigation className="w-5 h-5" /> },
  { id: 'passengers', label: 'Passengers', icon: <Users className="w-5 h-5" /> },
  { id: 'route', label: 'Route', icon: <RouteIcon className="w-5 h-5" /> },
  { id: 'incidents', label: 'Incidents', icon: <AlertTriangle className="w-5 h-5" /> },
  { id: 'profile', label: 'Profile', icon: <UserCircle className="w-5 h-5" /> },
];

interface DriverAppProps {
  driver: Driver;
  route: TransportRoute;
  vehicle: Vehicle;
  students: Student[];
  activeTrip: ActiveTrip;
  onAdvanceStop: () => void;
  onUpdateStudentStatus: (studentId: string, status: JourneyStatus) => void;
  onReportIncident: (type: string, message: string) => void;
}

/**
 * Captain shell. Deliberately minimal: large touch targets, one primary action
 * per screen, and no analytics that belong to the admin.
 */
export const DriverApp: React.FC<DriverAppProps> = (props) => {
  const [page, setPage] = useState<DriverPage>('trip');

  const { driver, route, vehicle, students, activeTrip } = props;

  return (
    <AppShell
      variant="top-nav"
      items={NAV_ITEMS}
      active={page}
      onNavigate={setPage}
      appLabel="Captain"
      ariaLabel="Captain sections"
    >
      {page === 'trip' && (
        <TripPage
          driver={driver}
          route={route}
          vehicle={vehicle}
          students={students}
          activeTrip={activeTrip}
          onAdvanceStop={props.onAdvanceStop}
          onGoToIncidents={() => setPage('incidents')}
        />
      )}

      {page === 'passengers' && (
        <PassengersPage
          route={route}
          vehicle={vehicle}
          students={students}
          onUpdateStudentStatus={props.onUpdateStudentStatus}
        />
      )}

      {page === 'route' && <RoutePage route={route} activeTrip={activeTrip} students={students} />}

      {page === 'incidents' && (
        <IncidentsPage
          driver={driver}
          vehicle={vehicle}
          route={route}
          onReportIncident={props.onReportIncident}
        />
      )}

      {page === 'profile' && (
        <ProfilePage driver={driver} vehicle={vehicle} route={route} students={students} />
      )}
    </AppShell>
  );
};
