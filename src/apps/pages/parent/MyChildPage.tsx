import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  Student,
  TransportRoute,
  Vehicle,
  Driver,
  ActiveTrip,
  RouteStop,
  TripType,
  TransportNotification,
  JourneyStatus,
} from '../../../types';
import type { calculateSmartETA } from '../../../utils/aiEngines';
import { Card, Button, Alert, Tabs } from '../../../components/ui';
import type { TabItem } from '../../../components/ui';
import {
  Bus,
  MapPin,
  Phone,
  ShieldCheck,
  Navigation,
  Bell,
  Sunrise,
  Sunset,
  CheckCircle2,
  Clock,
  GraduationCap,
} from 'lucide-react';

type ETA = ReturnType<typeof calculateSmartETA>;

interface MyChildPageProps {
  child: Student;
  route: TransportRoute;
  vehicle: Vehicle;
  driver: Driver;
  activeTrip: ActiveTrip;
  pickupStop: RouteStop;
  /** ETA to the child's pickup stop. */
  eta: ETA;
  /** ETA to the final (campus) stop. */
  campusEta: ETA;
  tripType: TripType;
  onToggleTripType: (type: TripType) => void;
  /** All children linked to this guardian. */
  children: Student[];
  selectedChildId: string;
  onSelectChild: (id: string) => void;
  alerts: TransportNotification[];
  onTrackBus: () => void;
  onOpenAlerts: () => void;
}

const STAGE_INDEX: Record<JourneyStatus, number> = {
  Waiting: 0,
  'Picked Up': 1,
  'On Board': 2,
  'Dropped Off': 3,
  Absent: 0,
};

const STATUS_VIEW: Record<
  JourneyStatus,
  { label: string; dot: string; text: string; ring: string }
> = {
  Waiting: {
    label: 'Waiting at stop',
    dot: 'bg-warn-400',
    text: 'text-warn-300',
    ring: 'border-warn-500/40 bg-warn-500/10',
  },
  'Picked Up': {
    label: 'Picked up',
    dot: 'bg-ok-400',
    text: 'text-ok-300',
    ring: 'border-ok-500/40 bg-ok-500/10',
  },
  'On Board': {
    label: 'On board',
    dot: 'bg-ok-400',
    text: 'text-ok-300',
    ring: 'border-ok-500/40 bg-ok-500/10',
  },
  'Dropped Off': {
    label: 'Reached campus',
    dot: 'bg-brand-400',
    text: 'text-brand-300',
    ring: 'border-brand-500/40 bg-brand-500/10',
  },
  Absent: {
    label: 'Not travelling today',
    dot: 'bg-danger-400',
    text: 'text-danger-300',
    ring: 'border-danger-500/40 bg-danger-500/10',
  },
};

/**
 * Guardian home — "My Child's Journey". Answers at a glance:
 * is my child safe, and where are they? Calm, low-density, large status.
 */
export const MyChildPage: React.FC<MyChildPageProps> = ({
  child,
  route,
  vehicle,
  driver,
  activeTrip,
  pickupStop,
  eta,
  campusEta,
  tripType,
  onToggleTripType,
  children,
  selectedChildId,
  onSelectChild,
  alerts,
  onTrackBus,
  onOpenAlerts,
}) => {
  const reduceMotion = useReducedMotion();
  const corridor = route.name.split(':')[0];
  const status = STATUS_VIEW[child.journeyStatus] ?? STATUS_VIEW.Waiting;
  const stageIndex = STAGE_INDEX[child.journeyStatus] ?? 0;
  const isReturn = tripType === 'return';
  const delayed = activeTrip.delayMinutes > 0 || route.status === 'Delayed';
  const scheduleTime = isReturn ? pickupStop.returnTime : pickupStop.morningTime;
  const scheduledArrival = isReturn ? pickupStop.returnTime : route.campusArrivalTime;

  const heroLine =
    child.journeyStatus === 'Dropped Off'
      ? `Arrived at campus terminal`
      : child.journeyStatus === 'On Board' || child.journeyStatus === 'Picked Up'
        ? `Arriving at campus in ${campusEta.etaMinutes} min`
        : `Bus arriving at ${pickupStop.name} in ${eta.etaMinutes} min`;

  const tripTabs: TabItem<TripType>[] = [
    { id: 'morning', label: 'To Campus', icon: <Sunrise className="w-4 h-4" /> },
    { id: 'return', label: 'To Home', icon: <Sunset className="w-4 h-4" /> },
  ];

  const timeline = [
    { label: 'Picked up', detail: `At ${pickupStop.name}` },
    { label: 'On board', detail: vehicle.vehicleNumber },
    {
      label: stageIndex >= 3 ? 'Reached campus' : 'Reaching campus',
      detail: isReturn ? 'Home stop' : 'Campus terminal',
    },
  ];

  return (
    <div className="max-w-md mx-auto px-4 py-5 space-y-4">
      {/* Child switcher — only when the guardian has more than one child */}
      {children.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 py-1">
          {children.map((c) => {
            const active = c.id === selectedChildId;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelectChild(c.id)}
                aria-pressed={active}
                className={[
                  'flex items-center gap-2 shrink-0 pl-1.5 pr-3 py-1.5 rounded-full border transition-colors touch-target',
                  active
                    ? 'border-brand-500 bg-brand-500/15 text-white'
                    : 'border-line bg-surface text-slate-300 hover:border-line-strong',
                ].join(' ')}
              >
                <img src={c.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                <span className="text-xs font-semibold whitespace-nowrap">
                  {c.name.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <img
              src={child.avatar}
              alt=""
              className="w-12 h-12 rounded-2xl object-cover border border-line-strong"
            />
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ring-2 ring-canvas ${status.dot}`}
            />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">My Child</p>
            <h1 className="text-lg font-bold text-white truncate leading-tight">{child.name}</h1>
            <p className="text-[11px] text-slate-400 truncate">
              {corridor} • Pickup {pickupStop.name}
            </p>
          </div>
        </div>
        <Tabs
          items={tripTabs}
          value={tripType}
          onChange={onToggleTripType}
          variant="segment"
          ariaLabel="Select journey direction"
          className="scale-90 origin-right shrink-0"
        />
      </header>

      {/* Primary status — the answer to "are they safe?" */}
      <Card className={`border ${status.ring}`}>
        <div className="flex items-center gap-3">
          <span className="relative flex w-3.5 h-3.5 shrink-0">
            {!reduceMotion && child.journeyStatus !== 'Dropped Off' && (
              <motion.span
                className={`absolute inline-flex h-full w-full rounded-full opacity-70 ${status.dot}`}
                animate={{ scale: [1, 2], opacity: [0.7, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
              />
            )}
            <span className={`relative inline-flex rounded-full w-3.5 h-3.5 ${status.dot}`} />
          </span>
          <h2 className={`text-2xl font-bold leading-tight ${status.text}`}>{status.label}</h2>
        </div>
        <p className="mt-2 text-sm text-slate-200">
          <span className="font-semibold text-white">{heroLine}</span>
          <span className="text-slate-400"> · on </span>
          <span className="font-mono text-slate-200">{vehicle.vehicleNumber}</span>
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-surface-2/60 border border-line p-3">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1">
              <Clock className="w-3 h-3" aria-hidden="true" />
              {isReturn ? 'Home arrival' : 'Campus arrival'}
            </span>
            <p className="mt-1 text-xl font-bold font-mono text-white">
              {child.journeyStatus === 'Dropped Off' ? 'Arrived' : scheduledArrival}
            </p>
            <span
              className={`text-[11px] ${delayed ? 'text-warn-400' : 'text-ok-400'}`}
            >
              {child.journeyStatus === 'Dropped Off'
                ? 'Cleared entry'
                : delayed
                  ? `~${Math.max(activeTrip.delayMinutes, 1)} min late`
                  : 'On schedule'}
            </span>
          </div>
          <div className="rounded-xl bg-surface-2/60 border border-line p-3">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1">
              <Bus className="w-3 h-3" aria-hidden="true" />
              Bus at stop
            </span>
            <p className="mt-1 text-xl font-bold font-mono text-white">
              {eta.etaMinutes === 0 ? 'Here' : `${eta.etaMinutes} min`}
            </p>
            <span className="text-[11px] text-slate-400">Scheduled {scheduleTime}</span>
          </div>
        </div>

        <Button
          variant="primary"
          size="lg"
          full
          className="mt-4"
          icon={<Navigation className="w-4 h-4" />}
          onClick={onTrackBus}
        >
          Track Bus
        </Button>
      </Card>

      {/* Delay / incident status */}
      {delayed ? (
        <Alert tone="warning" title={`${corridor} is delayed`}>
          Running about {Math.max(activeTrip.delayMinutes, 1)} min behind schedule
          {activeTrip.trafficLevel === 'Heavy' ? ' due to heavy corridor traffic' : ''}. We'll notify you
          of any change.
        </Alert>
      ) : (
        <div className="flex items-center gap-2.5 rounded-xl border border-ok-500/30 bg-ok-500/10 px-3.5 py-3 text-ok-300">
          <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="text-xs font-semibold">On time · no incidents reported</span>
        </div>
      )}

      {/* Journey timeline */}
      <Card padding="sm">
        <h3 className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-3">
          Journey Timeline
        </h3>
        <ol className="relative space-y-4">
          {timeline.map((step, i) => {
            const done = stageIndex > i;
            const current = stageIndex === i;
            return (
              <li key={step.label} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={[
                      'w-6 h-6 rounded-full flex items-center justify-center border shrink-0',
                      done
                        ? 'bg-ok-500 border-ok-400 text-white'
                        : current
                          ? 'bg-brand-500/20 border-brand-400 text-brand-300'
                          : 'bg-surface-2 border-line-strong text-slate-500',
                    ].join(' ')}
                  >
                    {done ? (
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                    ) : current ? (
                      <span className="w-2 h-2 rounded-full bg-brand-400" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-slate-600" />
                    )}
                  </span>
                  {i < timeline.length - 1 && (
                    <span
                      className={`w-0.5 h-6 mt-1 ${done ? 'bg-ok-500/50' : 'bg-line'}`}
                      aria-hidden="true"
                    />
                  )}
                </div>
                <div className="pt-0.5 min-w-0">
                  <p
                    className={`text-sm font-semibold leading-tight ${
                      done || current ? 'text-white' : 'text-slate-500'
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">{step.detail}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </Card>

      {/* Driver */}
      <Card padding="sm">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Driver</h3>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-ok-400">
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            Verified
          </span>
        </div>
        <div className="flex items-center gap-3">
          <img
            src={driver.avatar}
            alt=""
            className="w-12 h-12 rounded-xl object-cover border border-line-strong shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white truncate">Captain {driver.name}</p>
            <p className="text-[11px] text-slate-400 font-mono truncate">
              {driver.cell} • ★ {driver.rating} • {driver.experienceYears ?? 0}y
            </p>
          </div>
          <a
            href={`tel:${driver.cell}`}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-ok-500 text-slate-950 font-bold text-xs hover:bg-ok-400 transition-colors touch-target"
          >
            <Phone className="w-4 h-4" aria-hidden="true" />
            Call
          </a>
        </div>
      </Card>

      {/* Recent alerts */}
      <Card padding="sm">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
            <Bell className="w-3.5 h-3.5" aria-hidden="true" />
            Recent Alerts
          </h3>
          <button
            type="button"
            onClick={onOpenAlerts}
            className="text-[11px] font-semibold text-brand-300 hover:text-brand-400 transition-colors"
          >
            View all
          </button>
        </div>
        {alerts.length === 0 ? (
          <p className="text-xs text-slate-400 py-2">
            No alerts yet. Boarding and arrival updates will appear here.
          </p>
        ) : (
          <ul className="space-y-2">
            {alerts.map((a) => (
              <li
                key={a.id}
                className="flex items-start gap-2.5 rounded-lg bg-surface-2/50 border border-line px-3 py-2.5"
              >
                <span className="mt-0.5 shrink-0 text-brand-300" aria-hidden="true">
                  {a.type === 'delay' || a.type === 'emergency' ? (
                    <Clock className="w-3.5 h-3.5" />
                  ) : (
                    <GraduationCap className="w-3.5 h-3.5" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-white truncate">{a.title}</span>
                  <span className="block text-[11px] text-slate-400 leading-snug">{a.message}</span>
                  <span className="block text-[10px] font-mono text-slate-500 mt-0.5">{a.timestamp}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-500">
          <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          Live position updates on the Track tab.
        </p>
      </Card>
    </div>
  );
};
