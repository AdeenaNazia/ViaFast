import React, { useState } from 'react';
import {
  Driver,
  TransportRoute,
  Vehicle,
  Student,
  ActiveTrip,
  JourneyStatus,
} from '../types';
import {
  Bus,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  UserCheck,
  GraduationCap,
  Briefcase,
  ChevronRight,
  Send,
  Radio,
  RotateCcw,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface DriverPortalProps {
  driver: Driver;
  route: TransportRoute;
  vehicle: Vehicle;
  students: Student[];
  activeTrip: ActiveTrip;
  onAdvanceStop: () => void;
  onUpdateStudentStatus: (studentId: string, status: JourneyStatus) => void;
  onReportIncident: (type: string, message: string) => void;
}

export const DriverPortal: React.FC<DriverPortalProps> = ({
  driver,
  route,
  vehicle,
  students,
  activeTrip,
  onAdvanceStop,
  onUpdateStudentStatus,
  onReportIncident,
}) => {
  const [tripDirection, setTripDirection] = useState<'morning' | 'return'>('morning');
  const [manifestFilter, setManifestFilter] = useState<'all' | 'Waiting' | 'On Board' | 'Absent'>('all');
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueType, setIssueType] = useState('Traffic Bottleneck');
  const [issueDetails, setIssueDetails] = useState('Heavy bumper-to-bumper queue near Northern Bypass intersection.');

  const currentStopIndex = Math.min(activeTrip.currentStopIndex, route.stops.length - 1);
  const currentStop = route.stops[currentStopIndex];
  const nextStop = route.stops[Math.min(currentStopIndex + 1, route.stops.length - 1)];

  // Route students
  const routeStudents = students.filter((s) => s.routeId === route.id);
  const currentStopStudents = routeStudents.filter((s) => s.pickupStopId === currentStop.id);

  // Filtered manifest
  const filteredStudents = routeStudents.filter((s) => {
    if (manifestFilter === 'all') return true;
    if (manifestFilter === 'Waiting') return s.journeyStatus === 'Waiting';
    if (manifestFilter === 'On Board') return s.journeyStatus === 'On Board' || s.journeyStatus === 'Picked Up';
    if (manifestFilter === 'Absent') return s.journeyStatus === 'Absent';
    return true;
  });

  const handleAdvance = () => {
    onAdvanceStop();
    confetti({ particleCount: 25, spread: 45 });
  };

  const handleIssueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onReportIncident(issueType, issueDetails);
    setShowIssueModal(false);
  };

  return (
    <div id="driver-portal" className="max-w-5xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Top Driver HUD Card */}
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
              <h2 className="text-xl font-black text-white">Captain {driver.name}</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/50">
                ACTIVE ON DUTY
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Assigned Vehicle: <strong className="text-slate-200">{vehicle.vehicleNumber}</strong> ({vehicle.capacity} Seater)
            </p>
            <div className="flex items-center gap-3 text-xs text-slate-300 mt-1">
              <span className="text-emerald-400 font-semibold">{route.name}</span>
            </div>
          </div>
        </div>

        {/* Direction Switch & Report Issue Button */}
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setTripDirection('morning')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                tripDirection === 'morning' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Morning Inbound
            </button>
            <button
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
            onClick={() => setShowIssueModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900/90 text-rose-300 border border-rose-800/80 text-xs font-bold transition-all shadow"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Report Incident</span>
          </button>
        </div>
      </div>

      {/* Stop Command Control Center */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold block mb-1">
              Current Stop Status • Stop #{currentStop.sequence} of {route.stops.length}
            </span>
            <h3 className="text-2xl font-black text-white">{currentStop.name}</h3>
            <span className="text-xs text-slate-400 font-mono">
              Scheduled Departure: <strong className="text-slate-200">{currentStop.morningTime}</strong>
            </span>
          </div>

          {/* Advance Stop Button (Driver big touch target) */}
          <button
            id="btn-driver-advance-stop"
            onClick={handleAdvance}
            className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm tracking-wide shadow-xl shadow-emerald-500/20 transition-all active:scale-95 shrink-0"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Depart & Advance to Next Stop</span>
          </button>
        </div>

        {/* Next Stop Telemetry Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950/70 p-4 rounded-2xl border border-slate-800 text-center">
          <div>
            <span className="text-[10px] uppercase font-mono text-slate-400 block">Upcoming Next Stop</span>
            <span className="text-sm font-bold text-white mt-1 block truncate">
              {nextStop.name}
            </span>
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
              {routeStudents.filter((s) => s.journeyStatus === 'On Board' || s.journeyStatus === 'Picked Up').length} / {vehicle.capacity}
            </span>
          </div>
        </div>
      </div>

      {/* Passenger Manifest: Student & Staff Boarding Verification */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white">Passenger Manifest & Verification</h3>
            <p className="text-xs text-slate-400">
              One-touch digital boarding verification with passenger role distinction
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {(['all', 'Waiting', 'On Board', 'Absent'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setManifestFilter(filter)}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  manifestFilter === filter
                    ? 'bg-slate-800 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {filter === 'all' ? 'All Passengers' : filter}
              </button>
            ))}
          </div>
        </div>

        {/* Passenger List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredStudents.map((passenger) => {
            const isBoarded = passenger.journeyStatus === 'On Board' || passenger.journeyStatus === 'Picked Up';
            const isAbsent = passenger.journeyStatus === 'Absent';
            const isFaculty = passenger.isStaff;

            return (
              <div
                key={passenger.id}
                className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={passenger.avatar}
                    alt={passenger.name}
                    className="w-11 h-11 rounded-xl object-cover border border-slate-700"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs">{passenger.name}</span>
                      {isFaculty ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-950 text-purple-300 border border-purple-800/60 flex items-center gap-1">
                          <Briefcase className="w-2.5 h-2.5" />
                          Faculty
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono text-slate-400 bg-slate-900 border border-slate-800">
                          {passenger.rollNumber}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-cyan-400" />
                      <span>{route.stops.find((s) => s.id === passenger.pickupStopId)?.name}</span>
                    </div>
                  </div>
                </div>

                {/* 1-touch Boarding Action Buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
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
                    onClick={() => onUpdateStudentStatus(passenger.id, 'Absent')}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      isAbsent
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : 'text-slate-500 hover:text-rose-400'
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
      </div>

      {/* Incident / Problem Report Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Broadcast Transport Incident</h3>
            <p className="text-xs text-slate-400">
              Your report alerts the Mobility Command Center and recalculates ETA for affected students.
            </p>

            <form onSubmit={handleIssueSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Incident Category</label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="Traffic Bottleneck">Traffic Bottleneck / Congestion (+10m)</option>
                  <option value="Mechanical Trouble">Mechanical Trouble / Emergency Halt</option>
                  <option value="Road Blocked / Route Diversion">Road Blocked / Route Diversion</option>
                  <option value="Severe Weather">Severe Fog / Weather Slowness</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Details & Location</label>
                <textarea
                  value={issueDetails}
                  onChange={(e) => setIssueDetails(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all shadow"
                >
                  <Send className="w-4 h-4" />
                  <span>Transmit Incident Alert</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
