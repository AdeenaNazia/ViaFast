import React from 'react';

export interface BottomNavItem<T extends string> {
  id: T;
  label: string;
  icon: React.ReactNode;
}

interface BottomNavigationProps<T extends string> {
  items: BottomNavItem<T>[];
  value: T;
  onChange: (id: T) => void;
  ariaLabel?: string;
}

/**
 * Mobile-only primary navigation (hidden from md upwards, where the
 * top bar tab strip takes over). Targets are >=56px tall for touch.
 */
export function BottomNavigation<T extends string>({
  items,
  value,
  onChange,
  ariaLabel = 'Primary',
}: BottomNavigationProps<T>) {
  return (
    <nav
      aria-label={ariaLabel}
      className="fixed inset-x-0 bottom-0 z-40 md:hidden border-t border-line bg-surface/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid auto-cols-fr grid-flow-col">
        {items.map((item) => {
          const active = item.id === value;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              aria-current={active ? 'page' : undefined}
              aria-label={item.label}
              className={[
                'flex flex-col items-center justify-center gap-1 min-h-[56px] py-2 text-[10px] font-semibold transition-colors',
                active ? 'text-brand-400' : 'text-slate-400 hover:text-slate-100',
              ].join(' ')}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
