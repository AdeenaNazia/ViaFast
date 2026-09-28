import React from 'react';
import { TransportNotification } from '../types';
import { Drawer, IconButton, EmptyState } from './ui';
import { Bell, CheckCircle2, AlertTriangle, Info, Trash2, BellOff } from 'lucide-react';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: TransportNotification[];
  onMarkAsRead: (id: string) => void;
  onClearAll: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onClearAll,
}) => {
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Transit Notifications"
      subtitle={`${unread} unread updates`}
      icon={<Bell className="w-5 h-5" />}
      iconTone="accent"
      headerActions={
        <IconButton
          label="Clear all notifications"
          icon={<Trash2 className="w-4 h-4" />}
          size="sm"
          onClick={onClearAll}
        />
      }
    >
      <div className="p-4 space-y-3">
        {notifications.length === 0 ? (
          <EmptyState
            icon={<BellOff className="w-6 h-6" />}
            title="No recent notifications"
            message="Transit alerts, delay warnings and journey updates will appear here."
          />
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => onMarkAsRead(n.id)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                !n.read
                  ? 'bg-slate-950/90 border-cyan-500/40 shadow-sm'
                  : 'bg-slate-950/40 border-slate-800 opacity-75'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {n.type === 'delay' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                  {n.type === 'status_change' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  {n.type === 'emergency' && <AlertTriangle className="w-4 h-4 text-rose-500" />}
                  {n.type === 'recommendation' && <Info className="w-4 h-4 text-cyan-400" />}
                  <h4 className="text-xs font-bold text-white">{n.title}</h4>
                </div>
                <span className="text-[10px] text-slate-500 font-mono shrink-0">{n.timestamp}</span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">{n.message}</p>
            </div>
          ))
        )}
      </div>
    </Drawer>
  );
};
