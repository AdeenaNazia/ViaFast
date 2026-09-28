import React from 'react';
import { TransportRoute, Vehicle, Driver } from '../types';
import { Modal } from './ui';
import { Bus, MapPin, Clock, Phone, User, Navigation } from 'lucide-react';

interface RouteStopsModalProps {
  route: TransportRoute | null;
  vehicle?: Vehicle;
  driver?: Driver;
  onClose: () => void;
}

export const RouteStopsModal: React.FC<RouteStopsModalProps> = ({
  route,
  vehicle,
  driver,
  onClose,
}) => {
  if (!route) return null;

  const shortName = route.name.split(':')[1]?.trim() || route.name;

  return (
    <Modal
      isOpen={!!route}
      onClose={onClose}
      size="lg"
      icon={<Bus className="w-5 h-5" />}
      iconTone="accent"
      title={`Route #${route.routeNumber} — ${shortName}`}
      subtitle={
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1">
            <Navigation className="w-3 h-3" /> {route.stops.length} stops
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {route.totalDistanceKm} km
          </span>
          {vehicle && (
            <span className="inline-flex items-center gap-1">
              <Bus className="w-3 h-3" /> {vehicle.vehicleNumber}
            </span>
          )}
        </span>
      }
    >
      <div className="px-5 sm:px-6 py-5 space-y-5">
        {/* Captain / Vehicle strip */}
        {(driver || vehicle) && (
          <div className="flex flex-wrap items-center gap-3 p-3 rounded-2xl bg-canvas/60 border border-line">
            {driver && (
              <div className="flex items-center gap-2 text-xs">
                <span className="p-1.5 rounded-lg bg-brand-600/15 text-brand-300 border border-brand-500/30">
                  <User className="w-3.5 h-3.5" />
                </span>
                <span className="text-slate-400">Captain</span>
                <span className="font-bold text-white">{driver.name}</span>
              </div>
            )}
            {driver?.cell && (
              <a
                href={`tel:${driver.cell.replace(/[^0-9+]/g, '')}`}
                className="flex items-center gap-1.5 text-xs font-mono font-semibold text-accent-300 hover:text-accent-400 transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                {driver.cell}
              </a>
            )}
            {vehicle && (
              <div className="ml-auto text-[11px] font-mono text-slate-400">
                {vehicle.type} • {vehicle.capacity} seats
              </div>
            )}
          </div>
        )}

        {/* Stop timeline */}
        <ol className="relative space-y-0">
          {route.stops.map((stop, idx) => {
            const isLast = idx === route.stops.length - 1;
            const isCampus = stop.name.toLowerCase().includes('campus');
            return (
              <li key={stop.id} className="relative flex gap-3 pb-3 last:pb-0">
                {/* Connector line */}
                {!isLast && (
                  <span
                    className="absolute left-[15px] top-8 bottom-0 w-px bg-line"
                    aria-hidden="true"
                  />
                )}
                {/* Sequence node */}
                <span
                  className={`relative z-10 shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold font-mono border ${
                    isCampus
                      ? 'bg-brand-600 text-white border-brand-500 shadow-glow-brand'
                      : 'bg-surface-2 text-slate-300 border-line-strong'
                  }`}
                >
                  {stop.sequence}
                </span>

                {/* Stop detail */}
                <div className="flex-1 min-w-0 flex items-start justify-between gap-3 pt-1">
                  <div className="min-w-0">
                    <p
                      className={`text-sm leading-snug truncate ${
                        isCampus ? 'font-bold text-white' : 'font-semibold text-slate-200'
                      }`}
                    >
                      {stop.name}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      {stop.distanceKm} km from origin
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-accent-300">
                      <Clock className="w-3 h-3" />
                      {stop.morningTime}
                    </span>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      ret {stop.returnTime}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </Modal>
  );
};
