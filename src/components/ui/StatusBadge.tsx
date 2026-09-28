import React from 'react';
import {
  Bus,
  CheckCircle2,
  Clock,
  UserCheck,
  UserX,
  Wrench,
  PauseCircle,
  AlertTriangle,
} from 'lucide-react';
import type { JourneyStatus, Vehicle, TransportRoute } from '../../types';

export type StatusKind = 'journey' | 'vehicle' | 'route';

interface StatusBadgeProps {
  kind: StatusKind;
  status: string;
  size?: 'sm' | 'md';
  className?: string;
}

interface StatusStyle {
  label: string;
  icon: React.ReactNode;
  classes: string;
}

const icon = (node: React.ReactNode) => node;

/* Every status pairs a color WITH an icon and a text label — never color alone. */
const journeyStyles: Record<JourneyStatus, StatusStyle> = {
  Waiting: {
    label: 'Waiting',
    icon: icon(<Clock className="w-3.5 h-3.5" />),
    classes: 'bg-warn-500/15 text-warn-300 border-warn-500/40',
  },
  'Picked Up': {
    label: 'Picked Up',
    icon: icon(<UserCheck className="w-3.5 h-3.5" />),
    classes: 'bg-brand-500/15 text-brand-300 border-brand-500/40',
  },
  'On Board': {
    label: 'On Board',
    icon: icon(<Bus className="w-3.5 h-3.5" />),
    classes: 'bg-accent-500/15 text-accent-300 border-accent-500/40',
  },
  'Dropped Off': {
    label: 'Dropped Off',
    icon: icon(<CheckCircle2 className="w-3.5 h-3.5" />),
    classes: 'bg-ok-500/15 text-ok-300 border-ok-500/40',
  },
  Absent: {
    label: 'Absent',
    icon: icon(<UserX className="w-3.5 h-3.5" />),
    classes: 'bg-danger-500/15 text-danger-300 border-danger-500/40',
  },
};

const vehicleStyles: Record<Vehicle['status'], StatusStyle> = {
  Active: {
    label: 'Active',
    icon: icon(<CheckCircle2 className="w-3.5 h-3.5" />),
    classes: 'bg-ok-500/15 text-ok-300 border-ok-500/40',
  },
  Maintenance: {
    label: 'Maintenance',
    icon: icon(<Wrench className="w-3.5 h-3.5" />),
    classes: 'bg-warn-500/15 text-warn-300 border-warn-500/40',
  },
  Delayed: {
    label: 'Delayed',
    icon: icon(<AlertTriangle className="w-3.5 h-3.5" />),
    classes: 'bg-danger-500/15 text-danger-300 border-danger-500/40',
  },
  Reserve: {
    label: 'Reserve',
    icon: icon(<PauseCircle className="w-3.5 h-3.5" />),
    classes: 'bg-surface-2 text-slate-300 border-line-strong',
  },
};

const routeStyles: Record<TransportRoute['status'], StatusStyle> = {
  'On Time': {
    label: 'On Time',
    icon: icon(<CheckCircle2 className="w-3.5 h-3.5" />),
    classes: 'bg-ok-500/15 text-ok-300 border-ok-500/40',
  },
  Delayed: {
    label: 'Delayed',
    icon: icon(<AlertTriangle className="w-3.5 h-3.5" />),
    classes: 'bg-danger-500/15 text-danger-300 border-danger-500/40',
  },
  Completed: {
    label: 'Completed',
    icon: icon(<CheckCircle2 className="w-3.5 h-3.5" />),
    classes: 'bg-surface-2 text-slate-300 border-line-strong',
  },
  Standby: {
    label: 'Standby',
    icon: icon(<PauseCircle className="w-3.5 h-3.5" />),
    classes: 'bg-warn-500/15 text-warn-300 border-warn-500/40',
  },
};

const styleFor = (kind: StatusKind, status: string): StatusStyle => {
  const map =
    kind === 'journey'
      ? (journeyStyles as Record<string, StatusStyle>)
      : kind === 'vehicle'
        ? (vehicleStyles as Record<string, StatusStyle>)
        : (routeStyles as Record<string, StatusStyle>);
  return (
    map[status] ?? {
      label: status,
      icon: icon(<Clock className="w-3.5 h-3.5" />),
      classes: 'bg-surface-2 text-slate-300 border-line-strong',
    }
  );
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ kind, status, size = 'sm', className = '' }) => {
  const style = styleFor(kind, status);
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full border font-semibold whitespace-nowrap',
        size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs',
        style.classes,
        className,
      ].join(' ')}
    >
      <span aria-hidden="true">{style.icon}</span>
      {style.label}
    </span>
  );
};
