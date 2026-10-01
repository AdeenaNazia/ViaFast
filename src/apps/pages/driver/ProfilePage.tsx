import React from 'react';
import { Driver, Vehicle, TransportRoute, Student } from '../../../types';
import { Phone, Star, IdCard, Bus, Route as RouteIcon, Users } from 'lucide-react';

interface ProfilePageProps {
  driver: Driver;
  vehicle: Vehicle;
  route: TransportRoute;
  students: Student[];
}

/** Captain profile and current assignment, drawn from the live fleet record. */
export const ProfilePage: React.FC<ProfilePageProps> = ({ driver, vehicle, route, students }) => {
  const assigned = students.filter((s) => s.routeId === route.id).length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <header>
        <h1 className="text-base font-bold text-white">Captain Profile</h1>
        <p className="text-xs text-slate-400 mt-0.5">Your credentials, assignment and duty status.</p>
      </header>

      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-4">
          <img
            src={driver.avatar}
            alt={driver.name}
            className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500/40"
          />
          <div className="min-w-0">
            <h2 className="text-lg font-black text-white truncate">{driver.name}</h2>
            <p className="text-[11px] font-mono text-slate-400">{driver.licenseNumber}</p>
            <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/50">
              {driver.status.toUpperCase()}
            </span>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-3 mt-6 pt-5 border-t border-slate-800 text-xs">
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <dt className="text-slate-500 text-[10px] uppercase font-mono flex items-center gap-1">
              <Star className="w-3 h-3 text-amber-400" aria-hidden="true" /> Rating
            </dt>
            <dd className="text-white font-bold font-mono mt-1">{driver.rating} / 5.0</dd>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <dt className="text-slate-500 text-[10px] uppercase font-mono">Service</dt>
            <dd className="text-white font-bold font-mono mt-1">{driver.experienceYears ?? '—'} years</dd>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <dt className="text-slate-500 text-[10px] uppercase font-mono flex items-center gap-1">
              <Bus className="w-3 h-3" aria-hidden="true" /> Vehicle
            </dt>
            <dd className="text-white font-semibold mt-1 truncate">{vehicle.vehicleNumber}</dd>
            <dd className="text-slate-400 text-[10px] font-mono">
              {vehicle.type} • {vehicle.capacity} seats
            </dd>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <dt className="text-slate-500 text-[10px] uppercase font-mono flex items-center gap-1">
              <RouteIcon className="w-3 h-3" aria-hidden="true" /> Corridor
            </dt>
            <dd className="text-white font-semibold mt-1 truncate">{route.name.split(':')[0]}</dd>
            <dd className="text-slate-400 text-[10px] font-mono flex items-center gap-1">
              <Users className="w-3 h-3" aria-hidden="true" />
              {assigned} registered
            </dd>
          </div>
        </dl>

        <a
          href={`tel:${driver.cell}`}
          className="mt-5 flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold border border-slate-700 transition-colors"
        >
          <Phone className="w-4 h-4" aria-hidden="true" />
          <span>My Contact Number: {driver.cell}</span>
        </a>
      </div>

      <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
        <IdCard className="w-3.5 h-3.5" aria-hidden="true" />
        License and background verification are managed by the transport office.
      </p>
    </div>
  );
};
