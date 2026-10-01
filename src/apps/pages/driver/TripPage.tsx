import React, { useState } from 'react';
import { Driver, TransportRoute, Vehicle, Student, ActiveTrip } from '../../../types';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface TripPageProps {
  driver: Driver;
  route: TransportRoute;
  vehicle: Vehicle;
  students: Student[];
  activeTrip: ActiveTrip;
  onAdvanceStop: () => void;
  onGoToIncidents: () => void;
}

/**
 * Captain's primary screen: who am I, where am I, and the one action that
 * matters — depart and advance. Manifest and incidents live on their own tabs.
 */
export const TripPage: React.FC<TripPageProps> = ({
  driver,
  route,
  vehicle,
  students,
  activeTrip,
  onAdvanceStop,
  onGoToIncidents,
}) => {
  const [tripDirection, setTripDirection] = useState<'morning' | 'return'>('morning');

  const currentStopIndex = Math.min(activeTrip.currentStopIndex, route.stops.length - 1);
  const currentStop = route.stops[currentStopIndex];
  const nextStop = route.stops[Math.min(currentStopIndex + 1, route.stops.length - 1)];

  const routeStudents = students.filter((s) => s.routeId === route.id);
  const currentStopStudents = routeStudents.filter((s) => s.pickupStopId === currentStop.id);
  const onBoard = routeStudents.filter(
    (s) => s.journeyStatus === 'On Board' || s.journeyStatus === 'Picked Up'
  ).length;

  const handleAdvance = () => {
    onAdvanceStop();
    confetti({ particleCount: 25, spread: 45 });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Driver HUD */}
      <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-xl backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src={driver.avatar}
              alt={driver.name}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500/40 shadow"
            />
            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full ring-2 ring-slate-900 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-white">Captain {driver.name}</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/50">
                ACTIVE ON DUTY
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Assigned Vehicle:{' '}
              <strong className="text-slate-200">{vehicle.vehicleNumber}</strong> ({vehicle.capacity} Seater)
            </p>
            <p className="text-xs text-emerald-400 font-semibold mt-1">{route.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setTripDirection('morning')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                tripDirection === 'morning' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Morning Inbound
            </button>
            <button
              type="button"
              onClick={() => setTripDirection('return')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                tripDirection === 'return' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Return (3:30 PM)
            </button>
          </div>

          <button
            id="btn-driver-report-issue"
            type="button"
            onClick={onGoToIncidents}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900/90 text-rose-300 border border-rose-800/80 text-xs font-bold transition-all shadow"
          >
            <AlertTriangle className="w-4 h-4" aria-hidden="true" />
            <span>Report Incident</span>
          </button>
        </div>
      </div>

      {/* Stop Command Control */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold block mb-1">
              Current Stop Status • Stop #{currentStop.sequence} of {route.stops.length}
            </span>
            <h2 className="text-2xl font-black text-white">{currentStop.name}</h2>
            <span className="text-xs text-slate-400 font-mono">
              Scheduled Departure:{' '}
              <strong className="text-slate-200">
                {tripDirection === 'morning' ? currentStop.morningTime : currentStop.returnTime}
              </strong>
            </span>
          </div>

          <button
            id="btn-driver-advance-stop"
            type="button"
            onClick={handleAdvance}
            className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm tracking-wide shadow-xl shadow-emerald-500/20 transition-all active:scale-95 shrink-0"
          >
            <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
            <span>Depart &amp; Advance to Next Stop</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950/70 p-4 rounded-2xl border border-slate-800 text-center">
          <div>
            <span className="text-[10px] uppercase font-mono text-slate-400 block">Upcoming Next Stop</span>
            <span className="text-sm font-bold text-white mt-1 block truncate">{nextStop.name}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono text-slate-400 block">Expected Waiting Here</span>
            <span className="text-lg font-black text-cyan-400 font-mono mt-0.5 block">
              {currentStopStudents.length} Passengers
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono text-slate-400 block">Total On Board</span>
            <span className="text-lg font-black text-emerald-400 font-mono mt-0.5 block">
              {onBoard} / {vehicle.capacity}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
