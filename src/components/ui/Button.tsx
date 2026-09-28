import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'accent';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Icon element rendered before the label */
  icon?: React.ReactNode;
  /** Stretch to full container width */
  full?: boolean;
  children?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-600 text-white hover:bg-brand-500 active:bg-brand-600 shadow-glow-brand border border-brand-500/40',
  accent:
    'bg-accent-500 text-slate-950 hover:bg-accent-400 active:bg-accent-500 font-bold shadow-glow-accent border border-accent-400/40',
  secondary:
    'bg-surface text-slate-200 hover:bg-surface-2 active:bg-surface border border-line hover:border-line-strong',
  ghost: 'bg-transparent text-slate-300 hover:bg-surface-2 hover:text-white border border-transparent',
  danger:
    'bg-danger-500/15 text-danger-300 hover:bg-danger-500/25 active:bg-danger-500/15 border border-danger-500/40',
  success:
    'bg-ok-500/15 text-ok-300 hover:bg-ok-500/25 active:bg-ok-500/15 border border-ok-500/40',
};

const sizeClasses: Record<ButtonSize, string> = {
  // md and lg keep a >=44px touch target; sm is for dense desktop toolbars
  sm: 'text-xs px-3 py-2 gap-1.5 rounded-lg min-h-[36px]',
  md: 'text-sm px-4 py-2.5 gap-2 rounded-xl min-h-[44px]',
  lg: 'text-base px-6 py-3 gap-2.5 rounded-xl min-h-[48px]',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon,
  full,
  className = '',
  children,
  type = 'button',
  ...rest
}) => (
  <button
    type={type}
    className={[
      'inline-flex items-center justify-center font-semibold transition-colors select-none',
      'disabled:opacity-50 disabled:pointer-events-none',
      variantClasses[variant],
      sizeClasses[size],
      full ? 'w-full' : '',
      className,
    ].join(' ')}
    {...rest}
  >
    {icon}
    {children}
  </button>
);
