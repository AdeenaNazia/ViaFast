import React from 'react';
import { Role } from '../types';
import { IconButton, Avatar } from './ui';
import { Bus, Printer, Bell } from 'lucide-react';

interface NavbarProps {
  currentRole: Role;
  /** Only ever called with 'landing' — persona switching lives in the auth modal. */
  onChangeRole: (role: Role) => void;
  onOpenSchedulePDF: () => void;
  onOpenNotifications: () => void;
  onOpenAuthModal: () => void;
  activeUserName?: string;
  activeUserAvatar?: string;
  activeUserBadge?: string;
  unreadCount: number;
  activeBusCount: number;
  /** Live fleet size, e.g. 6 — replaces previously hardcoded telemetry */
  totalVehicles?: number;
  /** Live registered passenger count — replaces previously hardcoded telemetry */
  registeredStudents?: number;
  /** Live overall utilization percent — replaces previously hardcoded telemetry */
  utilizationPercent?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  onChangeRole,
  onOpenSchedulePDF,
  onOpenNotifications,
  onOpenAuthModal,
  activeUserName = 'Sarah Ahmed',
  activeUserAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  activeUserBadge = 'CS-2023-104',
  unreadCount,
  activeBusCount,
  totalVehicles = 6,
  registeredStudents = 0,
  utilizationPercent = 0,
}) => {
  const getRoleLabel = () => {
    switch (currentRole) {
      case 'admin':
        return 'Command Center';
      case 'student':
        return 'Student Portal';
      case 'parent':
        return 'Parent Console';
      case 'driver':
        return 'Captain Mode';
      default:
        return 'Mobility Intelligence';
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-canvas/90 backdrop-blur-xl border-b border-line">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 md:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Logo & Brand */}
        <button
          type="button"
          onClick={() => onChangeRole('landing')}
          className="flex items-center gap-2.5 cursor-pointer select-none min-w-0 touch-target"
          aria-label="ViaFast home"
        >
          <span className="w-9 h-9 md:w-10 md:h-10 bg-brand-600 rounded-lg flex items-center justify-center shadow-glow-brand text-white shrink-0">
            <Bus className="w-5 h-5" />
          </span>
          <span className="text-left min-w-0">
            <span className="block text-base md:text-xl font-bold tracking-tight text-white leading-none truncate">
              ViaFast <span className="text-brand-400 font-light text-sm md:text-lg ml-0.5">{getRoleLabel()}</span>
            </span>
            <span className="hidden sm:block text-[10px] uppercase tracking-widest text-slate-500 font-mono mt-1">
              Track. Predict. Optimize.
            </span>
          </span>
        </button>

        {/* Live telemetry capsule — large desktop only, values come from App state */}
        <div className="hidden xl:flex items-center gap-6 bg-surface border border-line rounded-full px-6 py-2 shadow-xl">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">Active Fleet</span>
            <span className="text-xs font-bold text-brand-400 font-mono">
              {activeBusCount} / {totalVehicles} Active
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">Registered</span>
            <span className="text-xs font-bold text-accent-400 font-mono">{registeredStudents} Riders</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">Utilization</span>
            <span className="text-xs font-bold text-ok-400 font-mono">{utilizationPercent}%</span>
          </div>
          <div className="flex flex-col border-l border-line-strong pl-4">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">Session Mode</span>
            <span className="text-xs font-bold text-white capitalize">
              {currentRole === 'landing' ? 'Overview' : currentRole}
            </span>
          </div>
        </div>

        {/* Right tools */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            id="btn-nav-schedule-pdf"
            onClick={onOpenSchedulePDF}
            title="View & Export Official PDF Transport Timetable"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 min-h-[44px] rounded-xl text-xs font-semibold bg-surface hover:bg-surface-2 text-slate-200 border border-line transition-colors hover:border-brand-500/50"
          >
            <Printer className="w-3.5 h-3.5 text-brand-400" aria-hidden="true" />
            PDF Timetable
          </button>

          <IconButton
            id="btn-nav-notifications"
            label="Transport Notifications"
            icon={<Bell className="w-4 h-4" />}
            badge={unreadCount}
            onClick={onOpenNotifications}
          />

          <button
            type="button"
            id="btn-nav-auth-switch"
            onClick={onOpenAuthModal}
            title="Switch User / Mock Login"
            className="flex items-center gap-2 pl-1.5 pr-2.5 min-h-[44px] rounded-xl bg-surface hover:bg-surface-2 border border-line hover:border-brand-500/50 transition-colors group"
          >
            <Avatar src={activeUserAvatar} name={activeUserName} size="sm" presence />
            <span className="hidden lg:flex flex-col text-left">
              <span className="text-[11px] font-bold text-white group-hover:text-brand-400 leading-none">
                {(activeUserName || 'User').split(' ')[0]}
              </span>
              <span className="text-[9px] text-slate-500 font-mono leading-none mt-0.5">{activeUserBadge}</span>
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
