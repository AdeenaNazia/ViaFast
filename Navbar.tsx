import React from 'react';
import { Role } from '../types';
import {
  Bus,
  Shield,
  User,
  GraduationCap,
  Sparkles,
  Printer,
  Bell,
  Activity,
  Globe,
  Radio,
} from 'lucide-react';

interface NavbarProps {
  currentRole: Role;
  onChangeRole: (role: Role) => void;
  onOpenSchedulePDF: () => void;
  onOpenNotifications: () => void;
  onOpenAuthModal: () => void;
  activeUserName?: string;
  activeUserAvatar?: string;
  activeUserBadge?: string;
  unreadCount: number;
  activeBusCount: number;
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
    <header className="sticky top-0 z-40 w-full bg-[#020617]/90 backdrop-blur-xl border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 py-3 flex items-center justify-between gap-4">
        {/* Logo & Brand with Immersive Glow */}
        <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => onChangeRole('landing')}>
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.4)] text-white shrink-0">
            <Bus className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-none">
              ViaFast <span className="text-blue-400 font-light ml-1 text-lg sm:text-xl">{getRoleLabel()}</span>
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-mono mt-1">
              Track. Predict. Optimize.
            </p>
          </div>
        </div>

        {/* Immersive UI Telemetry Capsule */}
        <div className="hidden xl:flex items-center gap-6 bg-[#0f172a] border border-slate-800 rounded-full px-6 py-2 shadow-xl">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">Active Fleet</span>
            <span className="text-xs font-bold text-blue-400 font-mono">{activeBusCount} / 6 Active</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">Live Inbound</span>
            <span className="text-xs font-bold text-cyan-400 font-mono">142 Students</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">Avg. Capacity</span>
            <span className="text-xs font-bold text-emerald-400 font-mono">76%</span>
          </div>
          <div className="flex flex-col border-l border-slate-700 pl-4">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">Session Mode</span>
            <span className="text-xs font-bold text-white capitalize">{currentRole === 'landing' ? 'Overview' : currentRole}</span>
          </div>
        </div>

        {/* Center/Right: Role Switcher Tabs */}
        <nav className="flex items-center bg-[#0f172a] p-1 rounded-xl border border-slate-800 shadow-inner">
          <button
            id="nav-role-landing"
            onClick={() => onChangeRole('landing')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentRole === 'landing'
                ? 'bg-slate-800 text-blue-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Overview</span>
          </button>

          <button
            id="nav-role-student"
            onClick={() => onChangeRole('student')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentRole === 'student'
                ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.3)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Student</span>
          </button>

          <button
            id="nav-role-parent"
            onClick={() => onChangeRole('parent')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentRole === 'parent'
                ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.3)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Parent</span>
          </button>

          <button
            id="nav-role-driver"
            onClick={() => onChangeRole('driver')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentRole === 'driver'
                ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.3)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Driver</span>
          </button>

          <button
            id="nav-role-admin"
            onClick={() => onChangeRole('admin')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentRole === 'admin'
                ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.4)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Admin</span>
          </button>
        </nav>

        {/* Right Tools: Printable Schedule PDF, Notifications & Mock Login / Switch User */}
        <div className="flex items-center gap-2">
          {/* Official Schedule PDF Button */}
          <button
            id="btn-nav-schedule-pdf"
            onClick={onOpenSchedulePDF}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#0f172a] hover:bg-slate-800 text-slate-200 border border-slate-800 transition-all shadow hover:border-blue-500/50"
            title="View & Export Official PDF Transport Timetable"
          >
            <Printer className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">PDF Timetable</span>
          </button>

          {/* Notification Button */}
          <button
            id="btn-nav-notifications"
            onClick={onOpenNotifications}
            className="relative p-2 rounded-xl bg-[#0f172a] hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
            title="Transport Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[9px] font-bold text-white ring-2 ring-[#020617]">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Active User Switcher / Auth Pill */}
          <button
            id="btn-nav-auth-switch"
            onClick={onOpenAuthModal}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl bg-[#0f172a] hover:bg-slate-800 border border-slate-800 hover:border-blue-500/50 transition-all group"
            title="Switch User / Mock Login"
          >
            <div className="relative">
              <img
                src={activeUserAvatar}
                alt={activeUserName}
                className="w-6 h-6 rounded-lg object-cover border border-slate-700 group-hover:border-blue-500"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full ring-1 ring-[#020617]" />
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-[11px] font-bold text-white group-hover:text-blue-400 leading-none">
                {(activeUserName || 'User').split(' ')[0]}
              </span>
              <span className="text-[9px] text-slate-500 font-mono leading-none mt-0.5">
                {activeUserBadge}
              </span>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
