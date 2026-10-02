import React from 'react';
import { Student, TransportRoute, Vehicle, Driver } from '../../../types';
import { Card, StatusBadge, Button } from '../../../components/ui';
import { MapPin, Bus, Phone, ShieldCheck, Radio, Users } from 'lucide-react';

interface ChildrenPageProps {
  /** All students linked to this guardian. */
  children: Student[];
  routes: TransportRoute[];
  vehicles: Vehicle[];
  drivers: Driver[];
  selectedChildId: string;
  onSelectChild: (id: string) => void;
  onTrackChild: (id: string) => void;
}

/**
 * Guardian's linked children. Each card selects that child for the Home and
 * Track views, and offers one-tap tracking and captain contact.
 */
export const ChildrenPage: React.FC<ChildrenPageProps> = ({
  children,
  routes,
  vehicles,
  drivers,
  selectedChildId,
  onSelectChild,
  onTrackChild,
}) => {
  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-4">
      <header>
        <h1 className="text-base font-bold text-white">My Children</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          {children.length === 1
            ? 'Your linked child and their live transport status.'
            : `${children.length} children linked to your guardian account.`}
        </p>
      </header>

      {children.length === 0 ? (
        <Card className="text-center py-10">
          <Users className="w-6 h-6 text-slate-500 mx-auto" aria-hidden="true" />
          <p className="text-sm font-bold text-slate-200 mt-3">No children linked</p>
          <p className="text-xs text-slate-400 mt-1">
            Contact the transport office to link a student to your guardian account.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {children.map((child) => {
            const route = routes.find((r) => r.id === child.routeId) || routes[0];
            const vehicle = vehicles.find((v) => v.id === route?.busId) || vehicles[0];
            const driver = drivers.find((d) => d.id === route?.driverId) || drivers[0];
            const pickupStop =
              route?.stops.find((s) => s.id === child.pickupStopId) || route?.stops[0];
            const active = child.id === selectedChildId;

            return (
              <Card
                key={child.id}
                padding="sm"
                className={active ? 'border-brand-500/60' : ''}
              >
                <button
                  type="button"
                  onClick={() => onSelectChild(child.id)}
                  className="w-full text-left flex items-center gap-3"
                  aria-pressed={active}
                >
                  <div className="relative shrink-0">
                    <img
                      src={child.avatar}
                      alt=""
                      className="w-12 h-12 rounded-2xl object-cover border border-line-strong"
                    />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ring-2 ring-surface ${
                        child.journeyStatus === 'Dropped Off'
                          ? 'bg-brand-400'
                          : child.journeyStatus === 'Absent'
                            ? 'bg-danger-400'
                            : child.journeyStatus === 'Waiting'
                              ? 'bg-warn-400'
                              : 'bg-ok-400'
                      }`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white truncate">{child.name}</p>
                      {active && (
                        <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/40">
                          Viewing
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono truncate">
                      {child.rollNumber} • {route?.name.split(':')[0]}
                    </p>
                    <div className="mt-1.5">
                      <StatusBadge kind="journey" status={child.journeyStatus} size="sm" />
                    </div>
                  </div>
                </button>

                <dl className="grid grid-cols-2 gap-2 mt-3 text-[11px]">
                  <div className="rounded-lg bg-surface-2/50 border border-line px-2.5 py-2">
                    <dt className="text-slate-500 uppercase font-mono text-[9px] flex items-center gap-1">
                      <MapPin className="w-3 h-3" aria-hidden="true" /> Pickup
                    </dt>
                    <dd className="text-slate-200 font-semibold truncate mt-0.5">
                      {pickupStop?.name}
                    </dd>
                    <dd className="text-slate-400 font-mono text-[10px]">{pickupStop?.morningTime}</dd>
                  </div>
                  <div className="rounded-lg bg-surface-2/50 border border-line px-2.5 py-2">
                    <dt className="text-slate-500 uppercase font-mono text-[9px] flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-ok-400" aria-hidden="true" /> Captain
                    </dt>
                    <dd className="text-slate-200 font-semibold truncate mt-0.5">{driver?.name}</dd>
                    <dd className="text-slate-400 font-mono text-[10px] flex items-center gap-1">
                      <Bus className="w-3 h-3" aria-hidden="true" />
                      {vehicle?.vehicleNumber}
                    </dd>
                  </div>
                </dl>

                <div className="flex gap-2 mt-3">
                  <Button
                    variant="primary"
                    size="sm"
                    full
                    icon={<Radio className="w-4 h-4" />}
                    onClick={() => onTrackChild(child.id)}
                  >
                    Track
                  </Button>
                  <a
                    href={`tel:${driver?.cell}`}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-surface-2 hover:bg-line border border-line-strong text-ok-300 text-xs font-bold transition-colors touch-target"
                  >
                    <Phone className="w-4 h-4" aria-hidden="true" />
                    Call
                  </a>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
