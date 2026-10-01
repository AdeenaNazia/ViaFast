import React from 'react';
import { Student, TransportRoute, Vehicle, RouteStop } from '../../../types';
import { QrCode, ShieldCheck, Bus, MapPin, Hash } from 'lucide-react';

interface StudentPassPageProps {
  student: Student;
  route: TransportRoute;
  vehicle: Vehicle;
  pickupStop: RouteStop;
}

/**
 * Digital bus pass. Previously a collapsible panel inside StudentPortal;
 * promoted to its own destination so it is one tap away while boarding.
 */
export const StudentPassPage: React.FC<StudentPassPageProps> = ({
  student,
  route,
  vehicle,
  pickupStop,
}) => (
  <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
    <header>
      <h1 className="text-base font-bold text-white">Digital Bus Pass</h1>
      <p className="text-xs text-slate-400 mt-0.5">
        Show this pass to the captain when boarding.
      </p>
    </header>

    <div className="bg-gradient-to-r from-slate-900 to-slate-950 p-6 rounded-3xl border border-cyan-500/40 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-cyan-400" />
          <span className="text-xs font-mono uppercase tracking-wider text-cyan-300 font-bold">
            FAST Multan Official Transit Pass • Spring 2026
          </span>
        </div>
        <h2 className="text-lg font-extrabold text-white">
          {student.name} ({student.rollNumber})
        </h2>
        <div className="grid grid-cols-2 gap-4 text-xs text-slate-300">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Designated Route</span>
            <span className="font-semibold text-white">{route.name}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Designated Vehicle</span>
            <span className="font-semibold text-white">{vehicle.vehicleNumber}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Registered Stop</span>
            <span className="font-semibold text-cyan-300">{pickupStop.name}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Pass Status</span>
            <span className="font-bold text-emerald-400">ACTIVE &amp; VERIFIED</span>
          </div>
        </div>
      </div>

      {/* QR Code Graphic Mock */}
      <div className="p-4 bg-white rounded-2xl shadow-xl flex flex-col items-center justify-center shrink-0">
        <div className="w-32 h-32 bg-slate-950 p-2 rounded-xl flex flex-col items-center justify-center relative overflow-hidden">
          <QrCode className="w-28 h-28 text-white" />
        </div>
        <span className="text-[10px] font-mono font-bold text-slate-900 mt-2">
          TOKEN: {student.rollNumber.replace('-', '')}
        </span>
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
      <div className="p-4 rounded-2xl bg-surface border border-line">
        <Bus className="w-4 h-4 text-brand-400" aria-hidden="true" />
        <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mt-2">
          Pickup Window
        </span>
        <span className="block font-bold text-white mt-0.5">{pickupStop.morningTime}</span>
        <span className="block text-slate-400 mt-0.5">Return {pickupStop.returnTime}</span>
      </div>
      <div className="p-4 rounded-2xl bg-surface border border-line">
        <MapPin className="w-4 h-4 text-brand-400" aria-hidden="true" />
        <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mt-2">
          Stop Sequence
        </span>
        <span className="block font-bold text-white mt-0.5">
          #{pickupStop.sequence} of {route.stops.length}
        </span>
        <span className="block text-slate-400 mt-0.5 truncate">{pickupStop.name}</span>
      </div>
      <div className="p-4 rounded-2xl bg-surface border border-line">
        <Hash className="w-4 h-4 text-brand-400" aria-hidden="true" />
        <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mt-2">
          Registration
        </span>
        <span className="block font-bold text-white mt-0.5">{student.registrationStatus}</span>
        <span className="block text-slate-400 mt-0.5">Semester {student.semester}</span>
      </div>
    </div>
  </div>
);
