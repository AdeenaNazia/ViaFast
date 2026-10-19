import type { DataFreshness, TrackingStatus } from './types';

/**
 * Shared presentation metadata for tracking states. Every status carries a text
 * label and a short chip in addition to an accent colour, so state is never
 * communicated by colour alone (markers pair these with distinct icons/shapes).
 */
export interface StatusMeta {
  label: string;
  short: string;
  accent: string;
  textClass: string;
  chipClass: string;
}

export const TRACKING_STATUS_META: Record<TrackingStatus, StatusMeta> = {
  ACTIVE: {
    label: 'Active',
    short: 'ACTIVE',
    accent: '#22c55e',
    textClass: 'text-emerald-300',
    chipClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60',
  },
  STOPPED: {
    label: 'Stopped',
    short: 'STOPPED',
    accent: '#38bdf8',
    textClass: 'text-sky-300',
    chipClass: 'bg-sky-950/80 text-sky-300 border-sky-700/60',
  },
  DELAYED: {
    label: 'Delayed',
    short: 'DELAYED',
    accent: '#f59e0b',
    textClass: 'text-amber-300',
    chipClass: 'bg-amber-950/80 text-amber-300 border-amber-700/60',
  },
  COMPLETED: {
    label: 'Completed',
    short: 'ARRIVED',
    accent: '#a855f7',
    textClass: 'text-purple-300',
    chipClass: 'bg-purple-950/80 text-purple-300 border-purple-700/60',
  },
  OFFLINE: {
    label: 'Offline',
    short: 'NO SIGNAL',
    accent: '#64748b',
    textClass: 'text-slate-400',
    chipClass: 'bg-slate-800/80 text-slate-400 border-slate-600/60',
  },
};

export const FRESHNESS_META: Record<
  DataFreshness,
  { label: string; chipClass: string; dotClass: string }
> = {
  LIVE: {
    label: 'Live',
    chipClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60',
    dotClass: 'bg-emerald-400',
  },
  STALE: {
    label: 'Stale',
    chipClass: 'bg-amber-950/80 text-amber-300 border-amber-700/60',
    dotClass: 'bg-amber-400',
  },
  OFFLINE: {
    label: 'Offline',
    chipClass: 'bg-slate-800/80 text-slate-400 border-slate-600/60',
    dotClass: 'bg-slate-500',
  },
};
