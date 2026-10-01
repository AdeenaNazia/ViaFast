import React, { useState } from 'react';
import {
  Student,
  TransportRoute,
  Vehicle,
  Driver,
  ActiveTrip,
  JourneyStatus,
  RouteChangeRequest,
} from '../types';
import { calculateSmartETA } from '../utils/aiEngines';
import {
  Bus,
  MapPin,
  Clock,
  Phone,
  QrCode,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowRight,
  Send,
  User,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface StudentPortalProps {
  student: Student;
  route: TransportRoute;
  vehicle: Vehicle;
  driver: Driver;
  activeTrip: ActiveTrip;
  onUpdateJourneyStatus: (status: JourneyStatus) => void;
  onRequestRouteChange: (request: Partial<RouteChangeRequest>) => void;
  onPayFee: (studentId: string) => void;
  onOpenPaymentModal?: () => void;
  /** Navigates to the shell's Pass destination, which now owns the QR pass. */
  onViewPass?: () => void;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({
  student,
  route,
  vehicle,
  driver,
  activeTrip,
  onUpdateJourneyStatus,
  onRequestRouteChange,
  onPayFee,
  onOpenPaymentModal,
  onViewPass,
}) => {
  const [tripType, setTripType] = useState<'morning' | 'return'>('morning');
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [targetStopName, setTargetStopName] = useState('');
  const [changeReason, setChangeReason] = useState('Relocated residence closer to Northern Bypass');
  const [payingFee, setPayingFee] = useState(false);

  // Stop info
  const stopIndex = route.stops.findIndex((s) => s.id === student.pickupStopId);
  const studentStop = route.stops[stopIndex] || route.stops[0];

  // AI ETA calculation
  const etaData = calculateSmartETA(activeTrip, route, stopIndex >= 0 ? stopIndex : undefined);

  const handleStatusClick = (nextStatus: JourneyStatus) => {
    onUpdateJourneyStatus(nextStatus);
    if (nextStatus === 'On Board' || nextStatus === 'Dropped Off') {
      confetti({ particleCount: 35, spread: 50 });
    }
  };

  const handleFeePayment = () => {
    setPayingFee(true);
    setTimeout(() => {
      onPayFee(student.id);
      setPayingFee(false);
      confetti({ particleCount: 60, spread: 70 });
    }, 1000);
  };

  const handleRouteRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRequestRouteChange({
      studentId: student.id,
      studentName: student.name,
      studentRollNumber: student.rollNumber,
      currentRouteId: route.id,
      currentStopName: studentStop.name,
      requestedRouteId: route.id,
      requestedStopName: targetStopName || route.stops[1]?.name || 'Next Stop',
      reason: changeReason,
    });
    setShowChangeModal(false);
    confetti({ particleCount: 30, spread: 50 });
  };

  return (
    <div id="student-portal" className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src={student.avatar}
              alt={student.name}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-cyan-500/40 shadow"
            />
            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full ring-2 ring-slate-900" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white">{student.name}</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-800/50">
                {student.rollNumber}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {student.department} • Semester {student.semester}
            </p>
            <div className="flex items-center gap-3 text-xs text-slate-300 mt-2">
              <span className="flex items-center gap-1 font-semibold text-cyan-400">
                <Bus className="w-3.5 h-3.5" />
                {route?.name ? route.name.split(':')[0] : 'FAST Transport'}
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-300">
                Pickup: <strong>{studentStop.name}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Right actions: Digital Pass QR & Trip direction */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setTripType('morning')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                tripType === 'morning'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Morning Inbound
            </button>
            <button
              onClick={() => setTripType('return')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                tripType === 'return'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Return Trip (3:30 PM)
            </button>
          </div>

          <button
            id="btn-student-view-qr"
            onClick={onViewPass}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-bold border border-slate-700 transition-all shadow"
          >
            <QrCode className="w-4 h-4" />
            <span>Digital Bus Pass</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Live Tracking & ETA (Left) + Assigned Driver & Fee (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Live Journey Status & Predictive ETA */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Trip Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Live AI Arrival Prediction</h3>
                  <p className="text-xs text-slate-400">
                    Real-time transit calculation with corridor traffic feedback
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-800/50">
                {etaData.confidencePercent}% AI Confidence
              </span>
            </div>

            {/* ETA Big Display */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950/70 p-5 rounded-2xl border border-slate-800/80 text-center">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
                  Estimated Arrival at Stop
                </span>
                <div className="text-3xl font-black text-cyan-400 font-mono">
                  {etaData.etaMinutes} <span className="text-sm font-medium text-slate-400">mins</span>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  ({studentStop.morningTime})
                </span>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
                  Corridor Traffic Pace
                </span>
                <div className="text-lg font-bold text-slate-200 mt-1">
                  {activeTrip.speedKmh} <span className="text-xs text-slate-400">km/h</span>
                </div>
                <span className={`text-[11px] font-medium mt-1 block ${
                  activeTrip.trafficLevel === 'Heavy' ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {activeTrip.trafficLevel} Traffic
                </span>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
                  Approaching Stop
                </span>
                <div className="text-sm font-bold text-white mt-1.5 truncate">
                  {etaData.nextStopName}
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block font-mono">
                  {etaData.distanceRemainingKm} km remaining
                </span>
              </div>
            </div>

            {/* AI Explanation Pill */}
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-xs text-slate-300">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>{etaData.explanation}</span>
            </div>

            {/* Journey Status Interactive Flow */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Today's Journey Progress
                </span>
                <span className="text-xs text-slate-400">
                  Current Status: <strong className="text-cyan-400">{student.journeyStatus}</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['Waiting', 'Picked Up', 'On Board', 'Dropped Off'] as JourneyStatus[]).map((status) => {
                  const isActive = student.journeyStatus === status;
                  return (
                    <button
                      key={status}
                      id={`btn-journey-status-${status.toLowerCase().replace(' ', '-')}`}
                      onClick={() => handleStatusClick(status)}
                      className={`p-3 rounded-2xl border text-xs font-semibold transition-all text-center ${
                        isActive
                          ? 'bg-cyan-600 border-cyan-400 text-white shadow-lg shadow-cyan-900/30'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        {status === 'Waiting' && <span>🟡</span>}
                        {status === 'Picked Up' && <span>🟢</span>}
                        {status === 'On Board' && <span>🔵</span>}
                        {status === 'Dropped Off' && <span>✅</span>}
                      </div>
                      <span>{status}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Route Change Request Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-white">Need to change your pickup stop or route?</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Submit an instant route modification request for administrative batch approval.
              </p>
            </div>
            <button
              id="btn-open-route-change-modal"
              onClick={() => setShowChangeModal(true)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors shadow shrink-0"
            >
              Request Stop / Route Change
            </button>
          </div>
        </div>

        {/* Right Column: Assigned Bus & Driver + Fee Status */}
        <div className="space-y-6">
          {/* Driver Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
              Assigned Vehicle & Captain
            </h3>

            <div className="flex items-center gap-3">
              <img
                src={driver.avatar}
                alt={driver.name}
                className="w-12 h-12 rounded-2xl object-cover border border-slate-700"
              />
              <div>
                <h4 className="text-sm font-bold text-white">{driver.name}</h4>
                <p className="text-xs text-slate-400 font-mono">Cell: {driver.cell}</p>
                <div className="flex items-center gap-1.5 text-[11px] text-amber-400 mt-0.5">
                  <span>★ {driver.rating}</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-400">{driver.experienceYears}y Experience</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Vehicle:</span>
                <span className="font-bold text-white">{vehicle.vehicleNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Model:</span>
                <span>{vehicle.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Capacity:</span>
                <span className="font-mono">{vehicle.capacity} Seats</span>
              </div>
            </div>

            <a
              href={`tel:${driver.cell}`}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-bold transition-colors border border-slate-700"
            >
              <Phone className="w-4 h-4" />
              <span>Direct Call Driver ({driver.name})</span>
            </a>
          </div>

          {/* Transport Fee Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            {(() => {
              const feeStatus = student.feeStatus || (student.feePaid && student.totalFee && student.feePaid >= student.totalFee ? 'Paid' : 'Pending');
              const feeDueAmount = student.feeAmount ?? (student.totalFee && student.feePaid ? Math.max(0, student.totalFee - student.feePaid) : 28000);

              return (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
                      Transport Fee Breakdown
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        feeStatus === 'Paid'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}
                    >
                      {feeStatus.toUpperCase()}
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 space-y-2 text-xs text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Base Transit Subscription:</span>
                      <span className="font-mono text-white">Rs. 24,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Fuel & Corridor Indexing:</span>
                      <span className="font-mono text-white">Rs. 3,500</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Campus Access Security:</span>
                      <span className="font-mono text-white">Rs. 500</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-800 font-bold text-sm">
                      <span className="text-white">Total Semester Dues:</span>
                      <span className="font-mono text-cyan-400">Rs. {feeDueAmount.toLocaleString()}</span>
                    </div>
                  </div>

                  {feeStatus !== 'Paid' ? (
                    <div className="space-y-2">
                      <button
                        id="btn-student-pay-fee"
                        onClick={onOpenPaymentModal || handleFeePayment}
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] cursor-pointer"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>Pay Semester Dues (Rs. {feeDueAmount.toLocaleString()})</span>
                      </button>
                      <button
                        onClick={handleFeePayment}
                        disabled={payingFee}
                        className="w-full py-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 text-slate-400 hover:text-white font-semibold text-[11px] transition-colors border border-slate-800"
                      >
                        {payingFee ? 'Deducting from FAST Wallet...' : 'Instant 1-Touch Wallet Pay'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-950/50 text-emerald-400 text-xs font-semibold border border-emerald-800/50">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Fee Cleared for Current Semester</span>
                      </div>
                      {onOpenPaymentModal && (
                        <button
                          onClick={onOpenPaymentModal}
                          className="w-full py-1.5 rounded-xl bg-slate-800/70 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition-colors border border-slate-700"
                        >
                          View Official Paid Challan Receipt
                        </button>
                      )}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Stop / Route Change Request Modal */}
      {showChangeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Request Route or Stop Modification</h3>
            <p className="text-xs text-slate-400">
              Your request will be validated by the AI Capacity Engine and routed to the Admin batch processor.
            </p>

            <form onSubmit={handleRouteRequestSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Current Stop</label>
                <input
                  type="text"
                  disabled
                  value={studentStop.name}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Requested New Stop</label>
                <select
                  value={targetStopName}
                  onChange={(e) => setTargetStopName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                >
                  {route.stops.map((s) => (
                    <option key={s.id} value={s.name}>
                      #{s.sequence} {s.name} ({s.morningTime})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Reason for Request</label>
                <textarea
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setShowChangeModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all shadow"
                >
                  <Send className="w-4 h-4" />
                  <span>Submit Request</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
