import React, { useState } from 'react';
import { TransportRoute, Vehicle, ActiveTrip, TripType } from '../../types';
import { LiveMobilityMap } from '../../components/LiveMobilityMap';

interface TrackPageProps {
  routes: TransportRoute[];
  vehicles: Vehicle[];
  activeTrips: ActiveTrip[];
  /** Route the rider is registered on — pre-selected and its bus highlighted. */
  focusRouteId: string;
  highlightedBusId?: string;
  heading: string;
  subheading: string;
  /** Optional rider-specific strip rendered between the header and the map. */
  topSlot?: React.ReactNode;
  tripType: TripType;
  onToggleTripType: (type: TripType) => void;
  isSimulating: boolean;
  onToggleSimulation: () => void;
  simulationSpeed: number;
  onChangeSpeed: (speed: number) => void;
  onResetSimulation: () => void;
}

/**
 * Live tracking view shared by the Student and Parent shells. Wraps the same
 * LiveMobilityMap the Admin uses, narrowed to the rider's own corridor.
 */
export const TrackPage: React.FC<TrackPageProps> = ({
  routes,
  vehicles,
  activeTrips,
  focusRouteId,
  highlightedBusId,
  heading,
  subheading,
  topSlot,
  tripType,
  onToggleTripType,
  isSimulating,
  onToggleSimulation,
  simulationSpeed,
  onChangeSpeed,
  onResetSimulation,
}) => {
  const [selectedRouteId, setSelectedRouteId] = useState<string>(focusRouteId);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
      <header>
        <h1 className="text-base font-bold text-white">{heading}</h1>
        <p className="text-xs text-slate-400 mt-0.5">{subheading}</p>
      </header>

      {topSlot}

      <LiveMobilityMap
        routes={routes}
        vehicles={vehicles}
        activeTrips={activeTrips}
        selectedRouteId={selectedRouteId}
        onSelectRoute={setSelectedRouteId}
        tripType={tripType}
        onToggleTripType={onToggleTripType}
        isSimulating={isSimulating}
        onToggleSimulation={onToggleSimulation}
        simulationSpeed={simulationSpeed}
        onChangeSpeed={onChangeSpeed}
        onResetSimulation={onResetSimulation}
        highlightedBusId={highlightedBusId}
      />
    </div>
  );
};
