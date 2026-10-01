import React from 'react';
import type { BottomNavItem } from '../ui';

interface SideNavProps<T extends string> {
  items: BottomNavItem<T>[];
  value: T;
  onChange: (id: T) => void;
  /** Short app label shown above the nav, e.g. "Command Center". */
  label: string;
  ariaLabel?: string;
  footer?: React.ReactNode;
}

/**
 * Desktop vertical navigation. Used by the Admin shell, where eight
 * destinations are too many for a bottom bar or a top tab strip.
 */
export function SideNav<T extends string>({
  items,
  value,
  onChange,
  label,
  ariaLabel = 'Section',
  footer,
}: SideNavProps<T>) {
  return (
    <nav aria-label={ariaLabel} className="flex flex-col h-full">
      <span className="px-4 pt-5 pb-3 text-[10px] font-mono uppercase tracking-widest text-slate-500">
        {label}
      </span>

      <ul className="flex-1 space-y-0.5 px-2.5 overflow-y-auto no-scrollbar">
        {items.map((item) => {
          const active = item.id === value;
          return (
            <li key={item.id}>
              <button
                type="button"
                id={`sidenav-${item.id}`}
                onClick={() => onChange(item.id)}
                aria-current={active ? 'page' : undefined}
                className={[
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors touch-target',
                  active
                    ? 'bg-brand-600/15 text-brand-300 border border-brand-500/40 shadow-glow-brand'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-surface-2 border border-transparent',
                ].join(' ')}
              >
                <span aria-hidden="true" className={active ? 'text-brand-400' : 'text-slate-500'}>
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {footer && <div className="p-3 border-t border-line">{footer}</div>}
    </nav>
  );
}
