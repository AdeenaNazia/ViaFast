import React from 'react';

export interface TabItem<T extends string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
  /** Optional DOM id, preserved for existing hooks/tests */
  domId?: string;
}

interface TabsProps<T extends string> {
  items: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  variant?: 'segment' | 'underline';
  /** Hide labels below this breakpoint (icons remain) to save space */
  collapseLabelsBelow?: 'sm' | 'md' | 'lg';
  ariaLabel: string;
  className?: string;
}

const labelVisibility = {
  sm: 'hidden sm:inline',
  md: 'hidden md:inline',
  lg: 'hidden lg:inline',
};

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  variant = 'segment',
  collapseLabelsBelow,
  ariaLabel,
  className = '',
}: TabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={[
        'flex items-center gap-1 no-scrollbar overflow-x-auto',
        variant === 'segment' ? 'bg-surface border border-line rounded-xl p-1' : 'border-b border-line',
        className,
      ].join(' ')}
    >
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            id={item.domId}
            role="tab"
            aria-selected={active}
            aria-label={item.label}
            onClick={() => onChange(item.id)}
            className={[
              'inline-flex items-center justify-center gap-1.5 font-semibold whitespace-nowrap touch-target transition-colors',
              variant === 'segment' ? 'px-3 py-2 rounded-lg text-xs' : 'px-3 py-2.5 text-xs -mb-px border-b-2',
              variant === 'segment'
                ? active
                  ? 'bg-brand-600 text-white shadow-glow-brand'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-surface-2'
                : active
                  ? 'border-brand-500 text-brand-300'
                  : 'border-transparent text-slate-400 hover:text-slate-100',
            ].join(' ')}
          >
            {item.icon && <span aria-hidden="true">{item.icon}</span>}
            <span className={collapseLabelsBelow ? labelVisibility[collapseLabelsBelow] : ''}>
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
