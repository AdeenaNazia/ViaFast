import React from 'react';
import type { MetricTone } from './MetricCard';

interface ProgressIndicatorProps {
  /** 0 - 100 */
  value: number;
  tone?: MetricTone;
  label?: string;
  showValue?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const barTone: Record<MetricTone, string> = {
  neutral: 'bg-slate-400',
  brand: 'bg-brand-500',
  accent: 'bg-accent-500',
  ok: 'bg-ok-500',
  warn: 'bg-warn-500',
  danger: 'bg-danger-500',
};

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  value,
  tone = 'brand',
  label,
  showValue = false,
  size = 'md',
  className = '',
}) => {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={className}>
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && <span className="text-xs text-slate-400">{label}</span>}
          {showValue && <span className="text-xs font-mono font-bold text-slate-200">{clamped}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Progress'}
        className={`w-full rounded-full bg-surface-2 overflow-hidden ${size === 'md' ? 'h-2' : 'h-1.5'}`}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ease-out ${barTone[tone]}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};
