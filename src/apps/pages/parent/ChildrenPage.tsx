import React from 'react';
import { Student, TransportRoute, Vehicle, Driver } from '../../../types';
import { MapPin, Bus, Phone, ShieldCheck, ArrowRight, Radio } from 'lucide-react';

interface ChildrenPageProps {
  student: Student;
  route: TransportRoute;
  vehicle: Vehicle;
  driver: Driver;
  onTrackChild: () => void;
}

const statusTone: Record<string, string> = {
  Waiting: 'bg-amber-950/70 text-amber-300 border-amber-800/70',
  'Picked Up': 'bg-emerald-950/70 text-emerald-300 border-emerald-800/70',
  'On Board': 'bg-emerald-950/70 text-emerald-300 border-emerald-800/70',
  'Dropped Off': 'bg-blue-950/70 text-blue-300 border-blue-800/70',
  Absent: 'bg-rose-950/70 text-rose-300 border-rose-800/70',
};

/** Guardian's linked-child view: who is travelling, on what, and where they are. */
export const ChildrenPage: React.FC<ChildrenPageProps> = ({
  student,
  route,
  vehicle,
  driver,
  onTrackChild,
}) => {
  const pickupStop = route.stops.find((s) => s.id === student.pickupStopId) || route.stops[0];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <header>
        <h1 className="text-base font-bold text-white">My Children</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Students linked to your guardian account and their live transport status.
        </p>
      </header>

      <article className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={student.avatar}
                alt={student.name}
                className="w-14 h-14 rounded-2xl object-cover border-2 border-blue-500/40"
              />
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full ring-2 ring-slate-900" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">{student.name}</h2>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                {student.rollNumber} • {student.department}
              </p>
            </div>
          </div>

          <span
            className={`shrink-0 self-start px-3 py-1.5 rounded-xl text-[10px] font-bold border ${
              statusTone[student.journeyStatus] || 'bg-slate-900 text-slate-300 border-slate-700'
            }`}
          >
            {student.journeyStatus.toUpperCase()}
          </span>
        </div>

        <dl className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <dt className="text-slate-500 text-[10px] uppercase font-mono flex items-center gap-1">
              <Bus className="w-3 h-3" aria-hidden="true" /> Route
            </dt>
            <dd className="text-slate-200 font-semibold mt-1 truncate">{route.name.split(':')[0]}</dd>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <dt className="text-slate-500 text-[10px] uppercase font-mono flex items-center gap-1">
              <MapPin className="w-3 h-3" aria-hidden="true" /> Pickup
            </dt>
            <dd className="text-slate-200 font-semibold mt-1 truncate">{pickupStop.name}</dd>
            <dd className="text-slate-400 font-mono text-[10px]">{pickupStop.morningTime}</dd>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <dt className="text-slate-500 text-[10px] uppercase font-mono">Vehicle</dt>
            <dd className="text-slate-200 font-semibold mt-1 truncate">{vehicle.vehicleNumber}</dd>
            <dd className="text-slate-400 font-mono text-[10px]">{vehicle.capacity} seats</dd>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <dt className="text-slate-500 text-[10px] uppercase font-mono flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" aria-hidden="true" /> Captain
            </dt>
            <dd className="text-slate-200 font-semibold mt-1 truncate">{driver.name}</dd>
            <dd className="text-slate-400 font-mono text-[10px]">★ {driver.rating}</dd>
          </div>
        </dl>

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <button
            type="button"
            onClick={onTrackChild}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors shadow-[0_0_15px_rgba(37,99,235,0.3)]"
          >
            <Radio className="w-4 h-4" aria-hidden="true" />
            Track Live Bus
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <a
            href={`tel:${driver.cell}`}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-xs font-bold transition-colors"
          >
            <Phone className="w-4 h-4" aria-hidden="true" />
            Call {driver.name}
          </a>
        </div>
      </article>
    </div>
  );
};
