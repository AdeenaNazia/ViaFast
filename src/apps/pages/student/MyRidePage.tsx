import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  Student,
  TransportRoute,
  Vehicle,
  JourneyStatus,
  RouteStop,
  TripType,
  TransportNotification,
} from '../../../types';
import type { calculateSmartETA } from '../../../utils/aiEngines';
import {
  Card,
  StatusBadge,
  Button,
  ProgressIndicator,
  Alert,
  Tabs,
  IconButton,
} from '../../../components/ui';
import type { TabItem } from '../../../components/ui';
import {
  Bus,
  MapPin,
  Bell,
  Users,
  Sparkles,
  Navigation,
  QrCode,
  Sunrise,
  Sunset,
  Clock,
} from 'lucide-react';
import confetti from 'canvas-confetti';

type ETA = ReturnType<typeof calculateSmartETA>;

export interface Occupancy {
  registered: number;
  capacity: number;
  percent: number;
  label: string;
  tone: 'ok' | 'warn' | 'danger';
}

interface MyRidePageProps {
  student: Student;
  route: TransportRoute;
  vehicle: Vehicle;
  pickupStop: RouteStop;
  eta: ETA;
  tripType: TripType;
  onToggleTripType: (type: TripType) => void;
  occupancy: Occupancy;
  alerts: TransportNotification[];
  unreadCount: number;
  onUpdateJourneyStatus: (status: JourneyStatus) => void;
  onTrackBus: () => void;
  onViewPass: () => void;
  onOpenNotifications: () => void;
}

const JOURNEY_STEPS: JourneyStatus[] = ['Waiting', 'Picked Up', 'On Board', 'Dropped Off'];

const occupancyToneText: Record<Occupancy['tone'], string> = {
  ok: 'text-ok-400',
  warn: 'text-warn-400',
  danger: 'text-danger-400',
};

function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Student home — a focused "My Ride" view. Answers within a glance:
 * where the bus is, when it arrives, which stop, and journey status.
 * The live ETA is the visual focal point.
 */
export const MyRidePage: React.FC<MyRidePageProps> = ({
  student,
  route,
  vehicle,
  pickupStop,
  eta,
  tripType,
  onToggleTripType,
  occupancy,
  alerts,
  unreadCount,
  onUpdateJourneyStatus,
  onTrackBus,
  onViewPass,
  onOpenNotifications,
}) => {
  const reduceMotion = useReducedMotion();
  const firstName = student.name.split(' ')[0];
  const corridor = route.name.split(':')[0];
  const currentStepIndex = JOURNEY_STEPS.indexOf(student.journeyStatus);
  const arrived = eta.etaMinutes === 0;

  const handleStatus = (status: JourneyStatus) => {
    onUpdateJourneyStatus(status);
    if (status === 'On Board' || status === 'Dropped Off') {
      confetti({ particleCount: 35, spread: 50 });
    }
  };

  const tripTabs: TabItem<TripType>[] = [
    { id: 'morning', label: 'Morning', icon: <Sunrise className="w-4 h-4" /> },
    { id: 'return', label: 'Return', icon: <Sunset className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-md mx-auto px-4 py-5 space-y-4">
      {/* Greeting */}
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <img
              src={student.avatar}
              alt=""
              className="w-11 h-11 rounded-xl object-cover border border-line-strong"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-ok-500 rounded-full ring-2 ring-canvas" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-slate-400">{greetingFor(new Date().getHours())}</p>
            <h1 className="text-base font-bold text-white truncate leading-tight">{firstName}</h1>
            <p className="text-[11px] font-mono text-slate-500 truncate">{student.rollNumber}</p>
          </div>
        </div>
        <div className="relative shrink-0">
          <IconButton
            label="Notifications"
            icon={<Bell className="w-5 h-5" />}
            badge={unreadCount}
            onClick={onOpenNotifications}
          />
        </div>
      </header>

      {/* Route + pickup summary */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-300">
        <span className="inline-flex items-center gap-1.5 font-semibold text-brand-300">
          <Bus className="w-4 h-4" aria-hidden="true" />
          {corridor}
        </span>
        <span className="text-slate-600">•</span>
        <span className="inline-flex items-center gap-1.5 min-w-0">
          <MapPin className="w-4 h-4 text-accent-400 shrink-0" aria-hidden="true" />
          <span className="truncate">
            Pickup: <strong className="text-white">{pickupStop.name}</strong>
          </span>
        </span>
      </div>

      {/* ETA — focal point */}
      <Card className="relative overflow-hidden border-brand-500/40 shadow-glow-brand">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-600 text-white text-[11px] font-bold font-mono">
              <Bus className="w-3.5 h-3.5" aria-hidden="true" />
              {vehicle.vehicleNumber}
            </span>
            <StatusBadge kind="route" status={route.status} size="sm" />
          </div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ok-400">
            <span className="relative flex w-2 h-2">
              {!reduceMotion && (
                <motion.span
                  className="absolute inline-flex h-full w-full rounded-full bg-ok-400 opacity-75"
                  animate={{ scale: [1, 2.2], opacity: [0.75, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                />
              )}
              <span className="relative inline-flex rounded-full w-2 h-2 bg-ok-500" />
            </span>
            Live
          </span>
        </div>

        <div className="mt-4 text-center">
          <p className="text-[11px] font-mono uppercase tracking-widest text-slate-400">
            {arrived ? 'Your bus is here' : 'Arriving in'}
          </p>
          <div className="mt-1 flex items-baseline justify-center gap-2">
            <span className="relative inline-block h-16 overflow-hidden">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={eta.etaMinutes}
                  initial={reduceMotion ? false : { y: 24, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={reduceMotion ? undefined : { y: -24, opacity: 0 }}
                  transition={{ duration: 0.28, ease: 'easeOut' }}
                  className="block text-6xl font-black font-mono leading-[4rem] text-brand-300"
                >
                  {eta.etaMinutes}
                </motion.span>
              </AnimatePresence>
            </span>
            <span className="text-lg font-semibold text-slate-400">min</span>
          </div>
          <p className="mt-1 text-xs text-slate-300">
            <span className="font-mono font-semibold text-white">{eta.distanceRemainingKm} km</span> away
            <span className="text-slate-600"> • </span>
            Next: <span className="text-white">{eta.nextStopName}</span>
          </p>
        </div>

        <div className="mt-3 flex items-start gap-2 px-3 py-2 rounded-lg bg-surface-2/60 border border-line text-[11px] text-slate-300">
          <Sparkles className="w-3.5 h-3.5 text-accent-400 shrink-0 mt-0.5" aria-hidden="true" />
          <span className="min-w-0">
            {eta.explanation}
            <span className="text-slate-500"> · {eta.confidencePercent}% confidence</span>
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="primary" size="md" icon={<Navigation className="w-4 h-4" />} onClick={onTrackBus} full>
            Track Bus
          </Button>
          <Button variant="secondary" size="md" icon={<QrCode className="w-4 h-4" />} onClick={onViewPass} full>
            My Pass
          </Button>
        </div>
      </Card>

      {/* Occupancy */}
      <Card padding="sm">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-slate-400">
            <Users className="w-3.5 h-3.5" aria-hidden="true" />
            Occupancy
          </span>
          <span className={`text-xs font-bold ${occupancyToneText[occupancy.tone]}`}>{occupancy.label}</span>
        </div>
        <ProgressIndicator value={occupancy.percent} tone={occupancy.tone} size="sm" />
        <p className="mt-1.5 text-[11px] text-slate-400">
          {occupancy.registered} of {occupancy.capacity} seats booked on {corridor}
        </p>
      </Card>

      {/* Journey status */}
      <Card padding="sm">
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Journey Status</span>
          <StatusBadge kind="journey" status={student.journeyStatus} size="sm" />
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {JOURNEY_STEPS.map((status, i) => {
            const isActive = student.journeyStatus === status;
            const isDone = currentStepIndex > i;
            return (
              <button
                key={status}
                id={`btn-journey-status-${status.toLowerCase().replace(' ', '-')}`}
                onClick={() => handleStatus(status)}
                aria-pressed={isActive}
                className={[
                  'relative flex flex-col items-center gap-1.5 py-2.5 rounded-lg border text-[10px] font-semibold transition-colors touch-target',
                  isActive
                    ? 'bg-brand-600 border-brand-400 text-white shadow-glow-brand'
                    : isDone
                      ? 'bg-ok-500/10 border-ok-500/40 text-ok-300'
                      : 'bg-surface-2 border-line text-slate-400 hover:text-slate-200',
                ].join(' ')}
              >
                <span
                  className={[
                    'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border',
                    isActive
                      ? 'bg-white/20 border-white/50'
                      : isDone
                        ? 'bg-ok-500/20 border-ok-500/50'
                        : 'bg-surface border-line-strong',
                  ].join(' ')}
                >
                  {i + 1}
                </span>
                <span className="leading-tight text-center">{status}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Today's trips */}
      <Card padding="sm">
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Today</span>
          <Tabs
            items={tripTabs}
            value={tripType}
            onChange={onToggleTripType}
            variant="segment"
            ariaLabel="Select trip direction"
            className="scale-90 origin-right"
          />
        </div>
        <div className="space-y-2">
          <TripRow
            icon={<Sunrise className="w-4 h-4" />}
            label="Morning trip"
            time={pickupStop.morningTime}
            active={tripType === 'morning'}
          />
          <TripRow
            icon={<Sunset className="w-4 h-4" />}
            label="Return trip"
            time={pickupStop.returnTime}
            active={tripType === 'return'}
          />
        </div>
        <p className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-400">
          <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          Showing {tripType === 'morning' ? 'morning' : 'return'} pickup from {pickupStop.name}.
        </p>
      </Card>

      {/* Transport alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <Alert
              key={alert.id}
              tone={
                alert.type === 'delay' || alert.type === 'emergency'
                  ? 'warning'
                  : alert.type === 'success'
                    ? 'success'
                    : 'info'
              }
              title={alert.title}
            >
              {alert.message}
            </Alert>
          ))}
        </div>
      )}
    </div>
  );
};

const TripRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  time: string;
  active: boolean;
}> = ({ icon, label, time, active }) => (
  <div
    className={[
      'flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border transition-colors',
      active ? 'bg-brand-500/10 border-brand-500/40' : 'bg-surface-2/50 border-line',
    ].join(' ')}
  >
    <span className="flex items-center gap-2.5 min-w-0">
      <span className={active ? 'text-brand-300' : 'text-slate-500'} aria-hidden="true">
        {icon}
      </span>
      <span className={`text-xs font-semibold truncate ${active ? 'text-white' : 'text-slate-300'}`}>
        {label}
      </span>
    </span>
    <span className="text-xs font-mono font-bold text-slate-200 shrink-0">{time}</span>
  </div>
);
