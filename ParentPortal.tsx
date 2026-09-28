import React, { useState } from 'react';
import {
  Student,
  TransportRoute,
  Vehicle,
  Driver,
  ActiveTrip,
} from '../types';
import { calculateSmartETA } from '../utils/aiEngines';
import {
  Shield,
  Phone,
  Clock,
  MapPin,
  Bus,
  CheckCircle2,
  AlertTriangle,
  Bell,
  Heart,
  ShieldCheck,
  Sparkles,
  CreditCard,
  Receipt,
} from 'lucide-react';

interface ParentPortalProps {
  student: Student;
  route: TransportRoute;
  vehicle: Vehicle;
  driver: Driver;
  activeTrip: ActiveTrip;
  onOpenPaymentModal?: () => void;
}

export const ParentPortal: React.FC<ParentPortalProps> = ({
  student,
  route,
  vehicle,
  driver,
  activeTrip,
  onOpenPaymentModal,
}) => {
  const [journeyType, setJourneyType] = useState<'morning' | 'return'>('morning');

  const stopIndex = route.stops.findIndex((s) => s.id === student.pickupStopId);
  const studentStop = route.stops[stopIndex] || route.stops[0];
  const etaData = calculateSmartETA(activeTrip, route, stopIndex >= 0 ? stopIndex : undefined);

  // Status color styling
  const getStatusBadge = () => {
    switch (student.journeyStatus) {
      case 'Waiting':
        return {
          label: 'Waiting at Pickup Stop',
          emoji: '🟡',
          bg: 'bg-amber-950/80 border-amber-800 text-amber-300',
          desc: `Sarah is scheduled for pickup at ${studentStop.morningTime} at ${studentStop.name}.`,
        };
      case 'Picked Up':
      case 'On Board':
        return {
          label: 'Safely on Board Bus',
          emoji: '🟢',
          bg: 'bg-emerald-950/80 border-emerald-800 text-emerald-300',
          desc: `Sarah boarded ${vehicle.vehicleNumber}. Vehicle is cruising toward campus.`,
        };
      case 'Dropped Off':
        return {
          label: 'Safely Reached Campus Terminal',
          emoji: '✅',
          bg: 'bg-blue-950/80 border-blue-800 text-blue-300',
          desc: 'Sarah arrived at the University Main Gate Terminal and cleared entry security.',
        };
      default:
        return {
          label: 'Scheduled',
          emoji: '⚪',
          bg: 'bg-slate-900 border-slate-700 text-slate-300',
          desc: 'Journey scheduled for morning transport.',
        };
    }
  };

  const statusInfo = getStatusBadge();

  return (
    <div id="parent-portal" className="max-w-5xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-950 text-blue-400 rounded-2xl border border-blue-800/60">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-bold">
              Parent Guardian Safety Console
            </span>
            <h2 className="text-xl font-black text-white">
              Guardian of {student.name}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Roll No: {student.rollNumber} • {student.department}
            </p>
          </div>
        </div>

        {/* Direction Switch */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setJourneyType('morning')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              journeyType === 'morning'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Morning to Campus
          </button>
          <button
            onClick={() => setJourneyType('return')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              journeyType === 'return'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Return to Home (3:30 PM)
          </button>
        </div>
      </div>

      {/* Main Status Hero Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold block mb-1">
              Live Child Transit Status
            </span>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{statusInfo.emoji}</span>
              <h3 className="text-2xl font-black text-white">{statusInfo.label}</h3>
            </div>
            <p className="text-xs text-slate-300 mt-1.5">{statusInfo.desc}</p>
          </div>

          <div className={`px-4 py-2 rounded-2xl border text-xs font-bold text-center ${statusInfo.bg}`}>
            <span className="block text-[10px] uppercase tracking-wider opacity-80">Security Status</span>
            <span>VERIFIED & EN ROUTE</span>
          </div>
        </div>

        {/* Predictive Arrival Timings */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 bg-slate-950/70 rounded-2xl border border-slate-800 text-center">
            <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
              Estimated Bus Arrival at {studentStop.name}
            </span>
            <div className="text-3xl font-black text-cyan-400 font-mono">
              {etaData.etaMinutes} <span className="text-sm font-medium text-slate-400">mins</span>
            </div>
            <span className="text-xs text-slate-400 mt-1 block">
              Scheduled: <strong className="text-slate-200">{studentStop.morningTime}</strong>
            </span>
          </div>

          <div className="p-5 bg-slate-950/70 rounded-2xl border border-slate-800 text-center">
            <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
              Expected Campus Arrival
            </span>
            <div className="text-3xl font-black text-emerald-400 font-mono">
              8:23 <span className="text-sm font-medium text-slate-400">AM</span>
            </div>
            <span className="text-xs text-slate-400 mt-1 block">
              On time for 8:30 AM lectures
            </span>
          </div>

          <div className="p-5 bg-slate-950/70 rounded-2xl border border-slate-800 text-center">
            <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
              Corridor Traffic Factor
            </span>
            <div className="text-xl font-bold text-slate-200 mt-1 font-mono">
              {activeTrip.speedKmh} km/h
            </div>
            <span className="text-xs text-emerald-400 mt-1 block font-medium">
              {activeTrip.trafficLevel} Flow • No Bottlenecks
            </span>
          </div>
        </div>

        {/* AI Explanation Bar */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-950/30 border border-blue-800/40 text-xs text-slate-300">
          <Sparkles className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <span>
            {etaData.explanation} The campus transit dispatch center is actively monitoring this vehicle coordinate.
          </span>
        </div>
      </div>

      {/* Driver & Safety Call Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Driver Contact Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
              Designated Transport Captain
            </h4>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Background Verified</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <img
              src={driver.avatar}
              alt={driver.name}
              className="w-14 h-14 rounded-2xl object-cover border-2 border-blue-500/40"
            />
            <div>
              <h3 className="text-base font-bold text-white">{driver.name}</h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">Cell: {driver.cell}</p>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                <span>★ {driver.rating} rating</span>
                <span>•</span>
                <span>{driver.experienceYears} yrs university driving</span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <a
              href={`tel:${driver.cell}`}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-emerald-500/20"
            >
              <Phone className="w-4 h-4" />
              <span>Call Driver Directly ({driver.name})</span>
            </a>
          </div>
        </div>

        {/* Safety & Notifications Feed */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
              Parent Safety Alerts Feed
            </h4>
            <span className="text-[10px] font-mono text-cyan-400">REAL-TIME</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-slate-200 font-semibold">Morning Departure Alert</p>
                <p className="text-slate-400 text-[11px]">
                  {vehicle.vehicleNumber} commenced Route 2 from Dreem Garden at 7:15 AM.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-start gap-2.5">
              <Bell className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-slate-200 font-semibold">Stop Proximity Notification</p>
                <p className="text-slate-400 text-[11px]">
                  Coaster is 3 stops away from {studentStop.name}. Please ensure {(student.name || 'Student').split(' ')[0]} is at the stop.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transit Fee & Digital RFID Security Pass (Guardian View) */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
        {(() => {
          const feeStatus = student.feeStatus || (student.feePaid && student.totalFee && student.feePaid >= student.totalFee ? 'Paid' : 'Pending');
          const feeDueAmount = student.feeAmount ?? (student.totalFee && student.feePaid ? Math.max(0, student.totalFee - student.feePaid) : 28000);

          return (
            <>
              <div className="space-y-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
                    Transport Fee & Semester Status
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      feeStatus === 'Paid'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    }`}
                  >
                    {feeStatus === 'Paid' ? 'PAID & VERIFIED' : 'PENDING'}
                  </span>
                </div>
                <p className="text-sm font-bold text-white">
                  Semester Transit Pass Dues: <span className="font-mono text-cyan-400">Rs. {feeDueAmount.toLocaleString()}</span>
                </p>
                <p className="text-xs text-slate-400">
                  Registered Corridor: {route.name} • Pickup: {studentStop.name}
                </p>
              </div>

              <div>
                {feeStatus !== 'Paid' ? (
                  <button
                    onClick={onOpenPaymentModal}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Pay Student Fee Online (Rs. {feeDueAmount.toLocaleString()})</span>
                  </button>
                ) : (
                  <button
                    onClick={onOpenPaymentModal}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all shadow"
                  >
                    <Receipt className="w-4 h-4 text-emerald-400" />
                    <span>View Official Challan & Receipt</span>
                  </button>
                )}
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
};
