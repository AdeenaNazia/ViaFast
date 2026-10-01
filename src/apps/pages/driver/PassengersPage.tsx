import React, { useState } from 'react';
import { TransportRoute, Vehicle, Student, JourneyStatus } from '../../../types';
import { MapPin, Briefcase } from 'lucide-react';

interface PassengersPageProps {
  route: TransportRoute;
  vehicle: Vehicle;
  students: Student[];
  onUpdateStudentStatus: (studentId: string, status: JourneyStatus) => void;
}

type ManifestFilter = 'all' | 'Waiting' | 'On Board' | 'Absent';

/** Boarding manifest with one-touch verification. Moved out of the trip screen. */
export const PassengersPage: React.FC<PassengersPageProps> = ({
  route,
  vehicle,
  students,
  onUpdateStudentStatus,
}) => {
  const [manifestFilter, setManifestFilter] = useState<ManifestFilter>('all');

  const routeStudents = students.filter((s) => s.routeId === route.id);

  const filteredStudents = routeStudents.filter((s) => {
    if (manifestFilter === 'all') return true;
    if (manifestFilter === 'Waiting') return s.journeyStatus === 'Waiting';
    if (manifestFilter === 'On Board') return s.journeyStatus === 'On Board' || s.journeyStatus === 'Picked Up';
    if (manifestFilter === 'Absent') return s.journeyStatus === 'Absent';
    return true;
  });

  const boarded = routeStudents.filter(
    (s) => s.journeyStatus === 'On Board' || s.journeyStatus === 'Picked Up'
  ).length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-base font-bold text-white">Passenger Manifest &amp; Verification</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              One-touch digital boarding verification with passenger role distinction •{' '}
              <span className="text-emerald-400 font-semibold font-mono">
                {boarded} / {vehicle.capacity}
              </span>{' '}
              on board
            </p>
          </div>

          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {(['all', 'Waiting', 'On Board', 'Absent'] as ManifestFilter[]).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setManifestFilter(filter)}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  manifestFilter === filter ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {filter === 'all' ? 'All Passengers' : filter}
              </button>
            ))}
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 px-6 py-10 text-center">
            <p className="text-sm font-bold text-slate-200">No passengers in this view</p>
            <p className="text-xs text-slate-400 mt-1">
              {routeStudents.length} passengers are registered on {route.name.split(':')[0]}.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredStudents.map((passenger) => {
              const isBoarded = passenger.journeyStatus === 'On Board' || passenger.journeyStatus === 'Picked Up';
              const isAbsent = passenger.journeyStatus === 'Absent';

              return (
                <div
                  key={passenger.id}
                  className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={passenger.avatar}
                      alt={passenger.name}
                      className="w-11 h-11 rounded-xl object-cover border border-slate-700 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs truncate">{passenger.name}</span>
                        {passenger.isStaff ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-950 text-purple-300 border border-purple-800/60 flex items-center gap-1 shrink-0">
                            <Briefcase className="w-2.5 h-2.5" aria-hidden="true" />
                            Faculty
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono text-slate-400 bg-slate-900 border border-slate-800 shrink-0">
                            {passenger.rollNumber}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1 min-w-0">
                        <MapPin className="w-3 h-3 text-cyan-400 shrink-0" aria-hidden="true" />
                        <span className="truncate">
                          {route.stops.find((s) => s.id === passenger.pickupStopId)?.name}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onUpdateStudentStatus(passenger.id, 'On Board')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isBoarded
                          ? 'bg-emerald-500 text-slate-950 shadow-sm'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                      }`}
                    >
                      {isBoarded ? 'On Board ✓' : 'Board'}
                    </button>

                    <button
                      type="button"
                      onClick={() => onUpdateStudentStatus(passenger.id, 'Absent')}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        isAbsent ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'text-slate-500 hover:text-rose-400'
                      }`}
                      title="Mark Absent"
                    >
                      Absent
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
