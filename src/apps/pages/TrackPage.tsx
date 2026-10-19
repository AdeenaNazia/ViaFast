import React from 'react';
import { TransportRoute, Vehicle, ActiveTrip, Student, TripType } from '../../types';
import { LiveTrackingMap } from '../../components/LiveTrackingMap';
import {
  VehicleTrackingPanel,
  type TrackingPanelVariant,
} from '../../components/tracking/VehicleTrackingPanel';
import {
  useLiveTracking,
  selectForRoute,
} from '../../tracking/useLiveTracking';
import { simulatedTrackingProvider } from '../../tracking/simulatedTrackingProvider';
import { MapPin, Navigation } from 'lucide-react';

interface TrackPageProps {
  routes: TransportRoute[];
  vehicles: Vehicle[];
  activeTrips: ActiveTrip[];
  students: Student[];
  /** Route the rider is registered on — the ONLY corridor shown. */
  focusRouteId: string;
  /** The rider's own pickup/drop stop, drawn as the "YOUR STOP" ring. */
  focusStopId?: string;
  heading: string;
  subheading: string;
  /** Optional rider-specific strip rendered between the header and the map. */
  topSlot?: React.ReactNode;
  panelVariant: TrackingPanelVariant;
  panelTitle?: string;
  panelEtaLabel?: string;
  extraRows?: Array<{ label: string; value: React.ReactNode }>;
  tripType: TripType;
  onToggleTripType: (type: TripType) => void;
  isSimulating: boolean;
  onToggleSimulation: () => void;
  simulationSpeed: number;
  onChangeSpeed: (speed: number) => void;
  onResetSimulation: () => void;
}

/**
 * Live tracking view shared by the Student and Parent shells. It reads the same
 * provider-agnostic tracking model the Admin uses, then narrows hard to the
 * rider's own corridor and bus — a rider never sees the administrative fleet.
 */
export const TrackPage: React.FC<TrackPageProps> = ({
  routes,
  vehicles,
  activeTrips,
  students,
  focusRouteId,
  focusStopId,
  heading,
  subheading,
  topSlot,
  panelVariant,
  panelTitle,
  panelEtaLabel,
  extraRows,
  tripType,
  onToggleTripType,
  isSimulating,
  onToggleSimulation,
  simulationSpeed,
  onChangeSpeed,
  onResetSimulation,
}) => {
  const { vehicles: tracked, now, fleetFreshness } = useLiveTracking(simulatedTrackingProvider, {
    routes,
    vehicles,
    activeTrips,
    students,
    tripType,
  });

  const mine = selectForRoute(tracked, focusRouteId);
  // Scope the map to the rider's single corridor + bus only.
  const scopedRoutes = routes.filter((r) => r.id === focusRouteId);
  const scopedVehicles = mine ? [mine] : [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
      <header>
        <h1 className="text-base font-bold text-white">{heading}</h1>
        <p className="text-xs text-slate-400 mt-0.5">{subheading}</p>
      </header>

      {topSlot}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <LiveTrackingMap
            routes={scopedRoutes}
            vehicles={scopedVehicles}
            tripType={tripType}
            selectedVehicleId={mine?.vehicleId}
            focusStopId={focusStopId}
            followVehicleId={mine?.vehicleId}
            dataFreshness={fleetFreshness}
            title="My Bus"
            heightClass="h-[420px] lg:h-[560px]"
            showRouteFilter={false}
            showTelemetryHud={false}
            onToggleTripType={onToggleTripType}
            isSimulating={isSimulating}
            onToggleSimulation={onToggleSimulation}
            simulationSpeed={simulationSpeed}
            onChangeSpeed={onChangeSpeed}
            onResetSimulation={onResetSimulation}
          />
        </div>

        <div className="lg:col-span-1 space-y-3">
          {mine ? (
            <VehicleTrackingPanel
              tracking={mine}
              now={now}
              variant={panelVariant}
              title={panelTitle}
              primaryEtaLabel={panelEtaLabel}
              extraRows={extraRows}
            />
          ) : (
            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 text-center">
              <MapPin className="w-6 h-6 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400">
                No live bus on this corridor right now. Positions appear once the trip is dispatched.
              </p>
            </div>
          )}

          <p className="flex items-center gap-1.5 text-[11px] text-slate-500 px-1">
            <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
            You're seeing only your assigned bus and stop — not the whole fleet.
          </p>
        </div>
      </div>
    </div>
  );
};
