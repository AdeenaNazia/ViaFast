import React, { useState } from 'react';
import { TransportRoute, Vehicle, StaffMember } from '../types';
import {
  Briefcase,
  CheckCircle2,
  AlertTriangle,
  X,
  Sparkles,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface StaffRideModalProps {
  isOpen: boolean;
  onClose: () => void;
  routes: TransportRoute[];
  vehicles: Vehicle[];
  onConfirmStaffRide: (booking: {
    staffName: string;
    department: string;
    routeId: string;
    stopName: string;
    tripDate: string;
  }) => void;
}

export const StaffRideModal: React.FC<StaffRideModalProps> = ({
  isOpen,
  onClose,
  routes,
  vehicles,
  onConfirmStaffRide,
}) => {
  const [staffName, setStaffName] = useState('Dr. Hamza Bilal');
  const [department, setDepartment] = useState('Department of Computer Science');
  const [selectedRouteId, setSelectedRouteId] = useState(routes[0]?.id || '');
  const [selectedStopName, setSelectedStopName] = useState('');

  if (!isOpen) return null;

  const currentRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];
  const vehicle = vehicles.find((v) => v.id === currentRoute.busId);
  const stops = currentRoute.stops;

  // Student priority check: verify remaining seats
  const capacity = vehicle?.capacity || 30;
  const currentStudents = 24; // baseline demo
  const availableSeats = capacity - currentStudents;
  const isAvailable = availableSeats > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAvailable) return;

    confetti({ particleCount: 40, spread: 60 });
    onConfirmStaffRide({
      staffName,
      department,
      routeId: currentRoute.id,
      stopName: selectedStopName || stops[0].name,
      tripDate: 'Today',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-950 text-purple-400 border border-purple-800/60">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Staff / Faculty Transport Pass</h3>
              <p className="text-xs text-slate-400">
                Temporary single-trip corridor booking with student seat priority protection.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Faculty / Staff Member Name</label>
            <input
              type="text"
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Academic Department</label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Select Transit Corridor</label>
              <select
                value={selectedRouteId}
                onChange={(e) => {
                  setSelectedRouteId(e.target.value);
                  setSelectedStopName('');
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
              >
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {(r.name || `Route ${r.routeNumber}`).split(':')[0]} ({r.name.split(':')[1]?.slice(0, 15) || r.name}...)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Pickup Stop</label>
              <select
                value={selectedStopName || stops[0]?.name}
                onChange={(e) => setSelectedStopName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
              >
                {stops.map((s) => (
                  <option key={s.id} value={s.name}>
                    #{s.sequence} {s.name} ({s.morningTime})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Student Priority AI Check Card */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Student Capacity Priority Check:</span>
              </span>
              <span className="font-mono font-bold text-emerald-400">
                {availableSeats} Spare Seats Available
              </span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              University policy mandates enrolled student seat security. This coaster currently has {currentStudents}/{capacity} student reservations. Your temporary staff ride is pre-approved and will appear flagged as 👨‍🏫 Faculty on the driver manifest.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              id="btn-confirm-staff-pass"
              type="submit"
              disabled={!isAvailable}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all shadow-lg shadow-purple-900/30 disabled:opacity-40"
            >
              <UserCheck className="w-4 h-4" />
              <span>Confirm Faculty Transit Pass</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
