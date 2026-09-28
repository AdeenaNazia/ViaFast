import React from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle, X } from 'lucide-react';
import { IconButton } from './IconButton';

export type AlertTone = 'info' | 'success' | 'warning' | 'danger';

interface AlertProps {
  tone?: AlertTone;
  title?: string;
  children?: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}

const toneConfig: Record<AlertTone, { classes: string; icon: React.ReactNode }> = {
  info: {
    classes: 'bg-accent-500/10 border-accent-500/40 text-accent-300',
    icon: <Info className="w-4 h-4" />,
  },
  success: {
    classes: 'bg-ok-500/10 border-ok-500/40 text-ok-300',
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
  warning: {
    classes: 'bg-warn-500/10 border-warn-500/40 text-warn-300',
    icon: <AlertTriangle className="w-4 h-4" />,
  },
  danger: {
    classes: 'bg-danger-500/10 border-danger-500/40 text-danger-300',
    icon: <XCircle className="w-4 h-4" />,
  },
};

export const Alert: React.FC<AlertProps> = ({ tone = 'info', title, children, onDismiss, className = '' }) => {
  const config = toneConfig[tone];
  return (
    <div
      role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-xl border p-3 sm:p-4 ${config.classes} ${className}`}
    >
      <span className="shrink-0 mt-0.5" aria-hidden="true">
        {config.icon}
      </span>
      <div className="min-w-0 flex-1 text-sm">
        {title && <p className="font-bold leading-tight">{title}</p>}
        {children && <div className={title ? 'mt-1 text-slate-300' : 'text-slate-300'}>{children}</div>}
      </div>
      {onDismiss && (
        <IconButton
          label="Dismiss notification"
          icon={<X className="w-3.5 h-3.5" />}
          size="sm"
          onClick={onDismiss}
          className="bg-transparent border-transparent shrink-0"
        />
      )}
    </div>
  );
};
