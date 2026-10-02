import React, { useState } from 'react';
import { TransportNotification } from '../../../types';
import { Tabs, EmptyState } from '../../../components/ui';
import type { TabItem } from '../../../components/ui';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Info,
} from 'lucide-react';

interface AlertsPageProps {
  notifications: TransportNotification[];
  onMarkAsRead: (id: string) => void;
}

type Category = 'all' | 'safety' | 'delays' | 'journey' | 'system';

const CATEGORY_TABS: TabItem<Category>[] = [
  { id: 'all', label: 'All' },
  { id: 'safety', label: 'Safety' },
  { id: 'delays', label: 'Delays' },
  { id: 'journey', label: 'Journey' },
  { id: 'system', label: 'System' },
];

function categoryOf(type: string): Exclude<Category, 'all'> {
  switch (type) {
    case 'emergency':
    case 'alert':
    case 'warning':
      return 'safety';
    case 'delay':
      return 'delays';
    case 'status_change':
    case 'success':
      return 'journey';
    default:
      return 'system';
  }
}

const toneFor = (type: string) => {
  switch (type) {
    case 'emergency':
      return { icon: ShieldAlert, wrap: 'text-danger-400 bg-danger-500/10 border-danger-500/40' };
    case 'delay':
      return { icon: Clock, wrap: 'text-warn-400 bg-warn-500/10 border-warn-500/40' };
    case 'warning':
    case 'alert':
      return { icon: AlertTriangle, wrap: 'text-warn-400 bg-warn-500/10 border-warn-500/40' };
    case 'success':
    case 'status_change':
      return { icon: CheckCircle2, wrap: 'text-ok-400 bg-ok-500/10 border-ok-500/40' };
    default:
      return { icon: Info, wrap: 'text-brand-400 bg-brand-500/10 border-brand-500/40' };
  }
};

/**
 * Guardian alert center. Categorized feed over the same notification stream
 * the drawer uses, filtered to what a parent should see.
 */
export const AlertsPage: React.FC<AlertsPageProps> = ({ notifications, onMarkAsRead }) => {
  const [category, setCategory] = useState<Category>('all');

  const relevant = notifications.filter(
    (n) => !n.targetRole || n.targetRole === 'parent' || n.targetRole === 'all'
  );
  const visible =
    category === 'all' ? relevant : relevant.filter((n) => categoryOf(n.type) === category);
  const unread = relevant.filter((n) => !n.read).length;

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-4">
      <header>
        <h1 className="text-base font-bold text-white">Alerts</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          {unread > 0
            ? `${unread} unread of ${relevant.length} alerts about your child's journeys.`
            : `All ${relevant.length} alerts read.`}
        </p>
      </header>

      <Tabs
        items={CATEGORY_TABS}
        value={category}
        onChange={setCategory}
        variant="segment"
        ariaLabel="Filter alerts by category"
        className="w-full"
      />

      {visible.length === 0 ? (
        <EmptyState
          icon={<Bell className="w-6 h-6" />}
          title={category === 'all' ? 'No alerts right now' : `No ${category} alerts`}
          message="Departure, boarding, arrival and delay notifications for your child will appear here."
        />
      ) : (
        <ul className="space-y-2.5">
          {visible.map((n) => {
            const { icon: Icon, wrap } = toneFor(n.type);
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => !n.read && onMarkAsRead(n.id)}
                  className={[
                    'w-full text-left flex items-start gap-3 p-4 rounded-panel border transition-colors touch-target',
                    n.read
                      ? 'bg-surface/60 border-line'
                      : 'bg-surface border-line-strong hover:border-brand-500/50',
                  ].join(' ')}
                >
                  <span className={`shrink-0 p-2 rounded-xl border ${wrap}`} aria-hidden="true">
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold truncate ${n.read ? 'text-slate-300' : 'text-white'}`}
                      >
                        {n.title}
                      </span>
                      {!n.read && (
                        <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-brand-400" />
                      )}
                    </span>
                    <span className="block text-[11px] text-slate-400 mt-1 leading-relaxed">
                      {n.message}
                    </span>
                    <span className="block text-[10px] font-mono text-slate-500 mt-1.5">
                      {n.timestamp}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
        <Bell className="w-3.5 h-3.5" aria-hidden="true" />
        Alerts are generated by journey status changes and captain incident reports.
      </p>
    </div>
  );
};
