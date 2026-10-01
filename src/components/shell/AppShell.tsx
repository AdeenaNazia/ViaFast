import React from 'react';
import { BottomNavigation, Tabs, type BottomNavItem } from '../ui';
import { SideNav } from './SideNav';

/**
 * `top-nav`  — Student / Parent / Driver. Horizontal tabs on desktop,
 *              bottom bar on mobile. Few destinations, consumer-style.
 * `sidebar`  — Admin. Persistent left rail on desktop (eight destinations
 *              do not fit a bottom bar), scrollable tab strip on mobile.
 */
export type ShellVariant = 'top-nav' | 'sidebar';

interface AppShellProps<T extends string> {
  variant: ShellVariant;
  items: BottomNavItem<T>[];
  active: T;
  onNavigate: (id: T) => void;
  /** Short app label used for the sidebar heading, e.g. "Command Center". */
  appLabel: string;
  ariaLabel: string;
  /** Constrain content width for reading-oriented shells. Admin opts out. */
  wide?: boolean;
  children: React.ReactNode;
  sidebarFooter?: React.ReactNode;
}

export function AppShell<T extends string>({
  variant,
  items,
  active,
  onNavigate,
  appLabel,
  ariaLabel,
  wide = false,
  children,
  sidebarFooter,
}: AppShellProps<T>) {
  if (variant === 'sidebar') {
    return (
      <div className="flex flex-1 items-stretch min-h-0">
        <aside className="hidden md:block w-60 shrink-0 border-r border-line bg-surface/40 sticky top-16 h-[calc(100vh-4rem)]">
          <SideNav
            items={items}
            value={active}
            onChange={onNavigate}
            label={appLabel}
            ariaLabel={ariaLabel}
            footer={sidebarFooter}
          />
        </aside>

        <div className="flex-1 min-w-0 flex flex-col">
          {/* Mobile: the sidebar cannot fit, so the same destinations become a
              scrollable strip pinned under the global header. */}
          <div className="md:hidden sticky top-14 z-30 border-b border-line bg-canvas/95 backdrop-blur-xl">
            <Tabs
              items={items}
              value={active}
              onChange={onNavigate}
              variant="underline"
              ariaLabel={ariaLabel}
              className="border-0 px-2"
            />
          </div>

          <div className="flex-1 min-w-0">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      {/* Desktop top navigation */}
      <div className="hidden md:block border-b border-line bg-surface/30">
        <div className={wide ? 'px-4 sm:px-6' : 'max-w-6xl mx-auto px-4 sm:px-6'}>
          <Tabs
            items={items}
            value={active}
            onChange={onNavigate}
            variant="underline"
            ariaLabel={ariaLabel}
            className="border-0"
          />
        </div>
      </div>

      {/* pb-20 clears the fixed mobile bottom bar */}
      <div className="flex-1 pb-20 md:pb-0">{children}</div>

      <BottomNavigation items={items} value={active} onChange={onNavigate} ariaLabel={ariaLabel} />
    </div>
  );
}
