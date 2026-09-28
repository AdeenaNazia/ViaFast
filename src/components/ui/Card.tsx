import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Slight lift + border highlight on hover (pointer devices only) */
  interactive?: boolean;
}

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-4 sm:p-5',
  lg: 'p-5 sm:p-6',
};

export const Card: React.FC<CardProps> = ({
  padding = 'md',
  interactive = false,
  className = '',
  children,
  ...rest
}) => (
  <div
    className={[
      'bg-surface border border-line rounded-panel shadow-xl',
      paddingClasses[padding],
      interactive ? 'transition-colors hover:border-line-strong hover:bg-surface-2/40' : '',
      className,
    ].join(' ')}
    {...rest}
  >
    {children}
  </div>
);
