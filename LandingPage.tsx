import React from 'react';
import { Role, TransportRoute, Vehicle, Driver } from '../types';
import {
  Bus,
  Shield,
  GraduationCap,
  Radio,
  Activity,
  Printer,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Clock,
  MapPin,
  TrendingUp,
  Cpu,
} from 'lucide-react';

interface LandingPageProps {
  onSelectRole: (role: Role) => void;
  onOpenSchedulePDF: () => void;
  routes: TransportRoute[];
  vehicles: Vehicle[];
  drivers: Driver[];
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onSelectRole,
  onOpenSchedulePDF,
  routes,
  vehicles,
  drivers,
}) => {
  return (
    <div className="space-y-16 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Hero Section */}
      <section className="text-center space-y-6 pt-6 sm:pt-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-cyan-300 text-xs font-semibold shadow-inner">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Next-Generation Campus Transport Intelligence</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.1]">
          Via<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">Fast</span>
        </h1>

        <p className="text-lg sm:text-2xl font-bold text-slate-300 tracking-wide">
          Track. Predict. Optimize.
        </p>

        <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-400 leading-relaxed">
          A unified, connected campus mobility platform bringing Students, Parents, Drivers, and Transport Administrators together with real-time predictive analytics and autonomous fleet optimization.
        </p>

        {/* Primary CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            id="btn-hero-admin-center"
            onClick={() => onSelectRole('admin')}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm transition-all shadow-xl shadow-cyan-500/20 active:scale-95"
          >
            <Activity className="w-4 h-4" />
            <span>Launch Mobility Command Center</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            id="btn-hero-view-pdf"
            onClick={onOpenSchedulePDF}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 font-bold text-sm transition-all shadow active:scale-95"
          >
            <Printer className="w-4 h-4 text-cyan-400" />
            <span>Official Schedule Timetable PDF</span>
          </button>
        </div>
      </section>

      {/* Role Jump Portals Bento Grid */}
      <section className="space-y-6">
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-black text-white">
            Choose Your Dedicated Portal
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Experience role-tailored mobility workflows with zero clutter.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Student Card */}
          <div
            id="portal-card-student"
            onClick={() => onSelectRole('student')}
            className="group relative bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/50 p-6 rounded-3xl shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-950 text-cyan-400 border border-cyan-800/60 flex items-center justify-center group-hover:scale-110 transition-transform">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Student Portal</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Live bus tracking, predictive ETA at your stop, digital QR bus pass, and semester fee settlement.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 mt-4 group-hover:translate-x-1 transition-transform">
              <span>Open Student Console</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Parent Card */}
          <div
            id="portal-card-parent"
            onClick={() => onSelectRole('parent')}
            className="group relative bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 hover:border-blue-500/50 p-6 rounded-3xl shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-950 text-blue-400 border border-blue-800/60 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Parent / Guardian</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Reassuring safety view: waiting, boarded, or reached campus status with 1-touch driver call.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400 mt-4 group-hover:translate-x-1 transition-transform">
              <span>Open Parent Console</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Driver Card */}
          <div
            id="portal-card-driver"
            onClick={() => onSelectRole('driver')}
            className="group relative bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/50 p-6 rounded-3xl shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-950 text-emerald-400 border border-emerald-800/60 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Radio className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Driver Captain</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                High-contrast stop-by-stop sequencing, passenger manifest, 1-touch verification, and incident broadcasts.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 mt-4 group-hover:translate-x-1 transition-transform">
              <span>Open Driver Mode</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Admin Command Center Card */}
          <div
            id="portal-card-admin"
            onClick={() => onSelectRole('admin')}
            className="group relative bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/50 p-6 rounded-3xl shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-950 text-indigo-400 border border-indigo-800/60 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Activity className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Admin Command Center</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Live SVG transit map, ViaAI route optimizer, automated extra bus planner, and what-if stress tester.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 mt-4 group-hover:translate-x-1 transition-transform">
              <span>Open Command Center</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </section>

      {/* Official Fleet Corridors Preview Table */}
      <section className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold">
              Official University Timetable
            </span>
            <h3 className="text-xl font-black text-white mt-0.5">
              Active Transit Corridors & Captains
            </h3>
            <p className="text-xs text-slate-400">
              Configured from official transport schedule data • 5 Active Corridors
            </p>
          </div>
          <button
            onClick={onOpenSchedulePDF}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-bold border border-slate-700 transition-colors shadow shrink-0"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Open PDF Timetable</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {routes.map((route) => {
            const vehicle = vehicles.find((v) => v.id === route.busId);
            const driver = drivers.find((d) => d.id === route.driverId);
            const startStop = route.stops[0];
            const endStop = route.stops[route.stops.length - 1];

            return (
              <div
                key={route.id}
                className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-bold font-mono bg-cyan-950 text-cyan-300 border border-cyan-800/50">
                    Route #{route.routeNumber}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {route.stops.length} Stops
                  </span>
                </div>

                <h4 className="text-sm font-bold text-white">
                  {route?.name ? (route.name.split(':')[1]?.trim() || route.name) : `Route ${route.routeNumber}`}
                </h4>

                <div className="space-y-1 text-xs text-slate-300">
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>Origin ({startStop?.morningTime}):</span>
                    <span className="text-white truncate max-w-[140px]">{startStop?.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>Campus Arrival:</span>
                    <span className="text-cyan-400 font-mono font-bold">{endStop?.morningTime}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-200">{vehicle?.vehicleNumber}</span>
                  <span className="text-slate-400">Capt. {driver?.name}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
