import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, message, icon, action, className = '' }) => (
  <div
    className={`flex flex-col items-center justify-center text-center gap-3 rounded-panel border border-dashed border-line-strong bg-surface/50 px-6 py-10 ${className}`}
  >
    <span className="p-3 rounded-2xl bg-surface-2 text-slate-400 border border-line" aria-hidden="true">
      {icon ?? <Inbox className="w-6 h-6" />}
    </span>
    <div>
      <p className="text-sm font-bold text-slate-200">{title}</p>
      {message && <p className="text-xs text-slate-400 mt-1 max-w-sm">{message}</p>}
    </div>
    {action}
  </div>
);
