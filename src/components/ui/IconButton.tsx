import React from 'react';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible name — required, since there is no visible label */
  label: string;
  icon: React.ReactNode;
  size?: 'sm' | 'md';
  variant?: 'default' | 'active';
  /** Small count bubble (e.g. unread notifications) */
  badge?: number;
}

export const IconButton: React.FC<IconButtonProps> = ({
  label,
  icon,
  size = 'md',
  variant = 'default',
  badge,
  className = '',
  ...rest
}) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    className={[
      'relative inline-flex items-center justify-center rounded-xl border transition-colors touch-target',
      size === 'md' ? 'w-11 h-11' : 'w-9 h-9',
      variant === 'active'
        ? 'bg-surface-2 border-line-strong text-white'
        : 'bg-surface border-line text-slate-300 hover:bg-surface-2 hover:text-white hover:border-line-strong',
      'disabled:opacity-50 disabled:pointer-events-none',
      className,
    ].join(' ')}
    {...rest}
  >
    {icon}
    {badge !== undefined && badge > 0 && (
      <span
        aria-hidden="true"
        className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-brand-500 text-[9px] font-bold text-white ring-2 ring-canvas"
      >
        {badge > 9 ? '9+' : badge}
      </span>
    )}
  </button>
);
