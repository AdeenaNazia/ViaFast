import React from 'react';

export type MetricTone = 'neutral' | 'brand' | 'accent' | 'ok' | 'warn' | 'danger';

interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  /** Secondary line, e.g. "8 / 140 Booked" */
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: MetricTone;
  className?: string;
}

const valueTone: Record<MetricTone, string> = {
  neutral: 'text-white',
  brand: 'text-brand-400',
  accent: 'text-accent-400',
  ok: 'text-ok-400',
  warn: 'text-warn-400',
  danger: 'text-danger-400',
};

const iconTone: Record<MetricTone, string> = {
  neutral: 'text-slate-500',
  brand: 'text-brand-400',
  accent: 'text-accent-400',
  ok: 'text-ok-400',
  warn: 'text-warn-400',
  danger: 'text-danger-400',
};

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  hint,
  icon,
  tone = 'neutral',
  className = '',
}) => (
  <div className={`bg-surface border border-line rounded-panel p-4 shadow-xl ${className}`}>
    <div className="flex items-start justify-between gap-2">
      <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">{label}</span>
      {icon && <span className={iconTone[tone]} aria-hidden="true">{icon}</span>}
    </div>
    <div className={`mt-1.5 text-2xl sm:text-3xl font-bold font-mono leading-none ${valueTone[tone]}`}>
      {value}
    </div>
    {hint && <div className="mt-1.5 text-xs text-slate-400">{hint}</div>}
  </div>
);
