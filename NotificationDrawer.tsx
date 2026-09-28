import React from 'react';
import { TransportNotification } from '../types';
import {
  Bell,
  X,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  Trash2,
} from 'lucide-react';

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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/70 backdrop-blur-sm">
      <div className="relative w-full max-w-md h-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800/60">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Transit Notifications</h3>
              <p className="text-[11px] text-slate-400">
                {notifications.filter((n) => !n.read).length} unread updates
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClearAll}
              className="p-1.5 text-slate-400 hover:text-slate-200 text-xs transition-colors"
              title="Clear all notifications"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="p-4 space-y-3 flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No recent notifications.
            </div>
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
                  <span className="text-[10px] text-slate-500 font-mono shrink-0">
                    {n.timestamp}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {n.message}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
