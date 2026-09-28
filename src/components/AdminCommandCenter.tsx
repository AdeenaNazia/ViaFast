import React, { useState } from 'react';
import {
  TransportRoute,
  Vehicle,
  Driver,
  Student,
  ActiveTrip,
  AIRecommendation,
  TripType,
  RouteChangeRequest,
} from '../types';
import { LiveMobilityMap } from './LiveMobilityMap';
import { RouteStopsModal } from './RouteStopsModal';
import { calculateCapacityMetrics, runAIOptimization } from '../utils/aiEngines';
import {
  Sparkles,
  Sliders,
  Bus,
  Users,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Upload,
  Printer,
  Briefcase,
  Flame,
  CheckCheck,
  RotateCcw,
  Zap,
  Activity,
  MapPin,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface AdminCommandCenterProps {
  routes: TransportRoute[];
  vehicles: Vehicle[];
  drivers: Driver[];
  students: Student[];
  activeTrips: ActiveTrip[];
  recommendations: AIRecommendation[];
  tripType: TripType;
  onToggleTripType: (type: TripType) => void;
  isSimulating: boolean;
  onToggleSimulation: () => void;
  simulationSpeed: number;
  onChangeSpeed: (speed: number) => void;
  onResetSimulation: () => void;
  onOpenDataImport: () => void;
  onOpenExtraBus: () => void;
  onOpenWhatIf: () => void;
  onOpenBatchUpdates: () => void;
  onOpenStaffModal: () => void;
  onOpenSchedulePDF: () => void;
  onSelectRecommendation: (rec: AIRecommendation) => void;
  onTriggerBreakdown: () => void;
  onAcceptRecommendation: (rec: AIRecommendation) => void;
}

export const AdminCommandCenter: React.FC<AdminCommandCenterProps> = ({
  routes,
  vehicles,
  drivers,
  students,
  activeTrips,
  recommendations,
  tripType,
  onToggleTripType,
  isSimulating,
  onToggleSimulation,
  simulationSpeed,
  onChangeSpeed,
  onResetSimulation,
  onOpenDataImport,
  onOpenExtraBus,
  onOpenWhatIf,
  onOpenBatchUpdates,
  onOpenStaffModal,
  onOpenSchedulePDF,
  onSelectRecommendation,
  onTriggerBreakdown,
  onAcceptRecommendation,
}) => {
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [stopsRouteId, setStopsRouteId] = useState<string | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [activeTab, setActiveTab] = useState<'map' | 'routes' | 'fleet' | 'students'>('map');

  const stopsRoute = routes.find((r) => r.id === stopsRouteId) || null;

  const capacityMetrics = calculateCapacityMetrics(routes, vehicles, students);
  const totalCapacity = vehicles.reduce((acc, v) => acc + (v.status === 'Active' ? v.capacity : 0), 0);
  const totalRegistered = students.length;
  const overallUtilization = Math.round((totalRegistered / (totalCapacity || 1)) * 100);

  const pendingRecommendations = recommendations.filter((r) => r.status === 'pending');

  const handleRunOptimization = () => {
    const optRec = runAIOptimization(routes, vehicles, students);
    if (optRec) {
      onSelectRecommendation(optRec);
      confetti({ particleCount: 40, spread: 60 });
    }
  };

  return (
    <div id="admin-command-center" className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-in fade-in duration-300">
      {/* Top Mobility Telemetry HUD */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        <div className="bg-[#0f172a] border border-slate-800 p-4 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Campus Grid</span>
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-bold text-white mt-1">FAST Multan</div>
          <span className="text-[11px] text-emerald-400 font-medium">Academic Inbound</span>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 p-4 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Active Fleet</span>
            <Bus className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-bold text-blue-400 mt-1 font-mono">
            {activeTrips.length} / {vehicles.length}
          </div>
          <span className="text-[11px] text-slate-400">Coasters en route</span>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 p-4 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Fleet Utilization</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-bold text-cyan-400 mt-1 font-mono">
            {overallUtilization}%
          </div>
          <span className="text-[11px] text-slate-400">
            {totalRegistered} / {totalCapacity} Booked
          </span>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 p-4 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">On-Time Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400 mt-1 font-mono">
            96.4%
          </div>
          <span className="text-[11px] text-emerald-400">↑ 2% Peak buffer</span>
        </div>

        <div className="col-span-2 sm:col-span-4 lg:col-span-1 bg-[#0f172a] border border-blue-900/40 p-4 rounded-2xl shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-bold">ViaAI Engine</span>
            <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
          </div>
          <div className="text-base font-bold text-white mt-1">
            {pendingRecommendations.length} Recommendations
          </div>
          <span className="text-[11px] text-blue-400 font-medium">Rebalancing ready</span>
        </div>
      </div>

      {/* Quick Command Action Toolbar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 text-xs">
        <button
          id="btn-admin-optimize-routes"
          onClick={handleRunOptimization}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-[0_0_15px_rgba(37,99,235,0.35)] transition-all shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          <span>AI Optimize Routes</span>
        </button>

        <button
          id="btn-admin-deploy-extra-bus"
          onClick={onOpenExtraBus}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0f172a] hover:bg-slate-800 text-slate-200 border border-slate-800 font-semibold transition-colors shadow shrink-0"
        >
          <Bus className="w-4 h-4 text-blue-400" />
          <span>Deploy Extra Bus</span>
        </button>

        <button
          id="btn-admin-what-if"
          onClick={onOpenWhatIf}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0f172a] hover:bg-slate-800 text-slate-200 border border-slate-800 font-semibold transition-colors shadow shrink-0"
        >
          <Sliders className="w-4 h-4 text-cyan-400" />
          <span>What-If Simulator</span>
        </button>

        <button
          id="btn-admin-batch-updates"
          onClick={onOpenBatchUpdates}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0f172a] hover:bg-slate-800 text-slate-200 border border-slate-800 font-semibold transition-colors shadow shrink-0"
        >
          <CheckCheck className="w-4 h-4 text-purple-400" />
          <span>Batch Route Updates</span>
        </button>

        <button
          id="btn-admin-import-schedule"
          onClick={onOpenDataImport}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0f172a] hover:bg-slate-800 text-slate-200 border border-slate-800 font-semibold transition-colors shadow shrink-0"
        >
          <Upload className="w-4 h-4 text-amber-400" />
          <span>Import CSV / Excel</span>
        </button>

        <button
          id="btn-admin-staff-ride"
          onClick={onOpenStaffModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0f172a] hover:bg-slate-800 text-slate-200 border border-slate-800 font-semibold transition-colors shadow shrink-0"
        >
          <Briefcase className="w-4 h-4 text-indigo-400" />
          <span>Staff Ride Pass</span>
        </button>

        <button
          id="btn-admin-drill-breakdown"
          onClick={onTriggerBreakdown}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/80 font-semibold transition-colors shrink-0"
          title="Drill: Trigger simulated vehicle breakdown"
        >
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <span>Breakdown Drill</span>
        </button>
      </div>

      {/* Main Command Split Screen: Map (65%) + ViaAI Intelligence Panel (35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Mobility Map */}
        <div className="lg:col-span-8 space-y-4">
          <LiveMobilityMap
            routes={routes}
            vehicles={vehicles}
            activeTrips={activeTrips}
            selectedRouteId={selectedRouteId}
            onSelectRoute={(id) => setSelectedRouteId(id)}
            tripType={tripType}
            onToggleTripType={onToggleTripType}
            isSimulating={isSimulating}
            onToggleSimulation={onToggleSimulation}
            simulationSpeed={simulationSpeed}
            onChangeSpeed={onChangeSpeed}
            onResetSimulation={onResetSimulation}
            showHeatmap={showHeatmap}
            onToggleHeatmap={() => setShowHeatmap(!showHeatmap)}
          />

          {/* Route Capacity Strip */}
          <div className="bg-[#0f172a] border border-slate-800 p-4 rounded-2xl shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
                Corridor Load & Utilization Telemetry
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Warning threshold: <strong className="text-amber-400">80%</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {capacityMetrics.map((cm) => {
                const route = routes.find((r) => r.id === cm.routeId);
                return (
                  <div
                    key={cm.routeId}
                    onClick={() => setSelectedRouteId(cm.routeId)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      selectedRouteId === cm.routeId
                        ? 'bg-[#1e293b] border-blue-500 shadow-[0_0_12px_rgba(37,99,235,0.25)]'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-white truncate">{(cm.routeName || 'Corridor').split(':')[0]}</span>
                      <span
                        className={`text-[10px] font-bold font-mono ${
                          cm.utilizationPercent >= 85 ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {cm.utilizationPercent}%
                      </span>
                    </div>
                    {/* Mini Progress Bar */}
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-1.5">
                      <div
                        className={`h-full rounded-full ${
                          cm.utilizationPercent >= 85
                            ? 'bg-rose-500'
                            : cm.utilizationPercent >= 70
                            ? 'bg-amber-500'
                            : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(100, cm.utilizationPercent)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>{cm.registeredCount} Students</span>
                      <span>{cm.unusedSeats} Unused</span>
                    </div>
                    <button
                      id={`admin-route-stops-${cm.routeId}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setStopsRouteId(cm.routeId);
                      }}
                      className="mt-2 w-full flex items-center justify-center gap-1 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/70 text-[10px] font-bold text-cyan-300 transition-colors"
                    >
                      <MapPin className="w-3 h-3" />
                      View stops
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: ViaAI Intelligence Panel & Demand Heatmap */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <h3 className="text-sm font-bold text-white">ViaAI Intelligence</h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-900/30 text-blue-400 border border-blue-800">
                Autonomous
              </span>
            </div>

            {/* Recommendations List */}
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {recommendations.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">
                  All corridors operating within optimal thresholds. No active recommendations.
                </div>
              ) : (
                recommendations.map((rec) => {
                  const isPending = rec.status === 'pending';
                  return (
                    <div
                      key={rec.id}
                      className="p-4 rounded-xl bg-[#020617]/70 border border-slate-800 hover:border-blue-500/50 transition-all space-y-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[9px] font-mono uppercase tracking-wider text-blue-400 font-bold block">
                            {rec.type.toUpperCase()}
                          </span>
                          <h4 className="text-xs font-bold text-white mt-0.5">{rec.title}</h4>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-emerald-400 shrink-0">
                          {rec.confidence}% Conf.
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-2">
                        {rec.what}
                      </p>

                      {/* Before / After Mini Metric */}
                      <div className="grid grid-cols-2 gap-2 p-2 rounded-lg bg-slate-900 text-[10px] border border-slate-800">
                        <div>
                          <span className="text-slate-500 block">CURRENT</span>
                          <span className="text-slate-300 font-medium">
                            {rec.impactBefore.travelTimeMin}m trip
                          </span>
                        </div>
                        <div>
                          <span className="text-blue-400 block">OPTIMIZED</span>
                          <span className="text-emerald-400 font-bold">
                            {rec.impactAfter.travelTimeMin}m trip (-{rec.impactBefore.travelTimeMin - rec.impactAfter.travelTimeMin}m)
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between pt-1">
                        <button
                          onClick={() => onSelectRecommendation(rec)}
                          className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold"
                        >
                          Inspect Rationale →
                        </button>

                        {isPending ? (
                          <button
                            onClick={() => {
                              onAcceptRecommendation(rec);
                              confetti({ particleCount: 30, spread: 50 });
                            }}
                            className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold transition-colors shadow-[0_0_10px_rgba(37,99,235,0.3)]"
                          >
                            Accept
                          </button>
                        ) : (
                          <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Executed
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Immersive UI Demand Heatmap Container */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Corridor Demand Heatmap
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">Live Multan Hubs</span>
            </div>
            <div className="flex items-end gap-1.5 h-20 px-1">
              <div className="flex-1 bg-blue-500/20 hover:bg-blue-500/40 h-10 rounded-t transition-all group relative cursor-pointer" title="BCG Chowk: 24 students">
                <span className="opacity-0 group-hover:opacity-100 absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-mono bg-slate-900 px-1 rounded text-cyan-300">24</span>
              </div>
              <div className="flex-1 bg-blue-500/40 hover:bg-blue-500/60 h-14 rounded-t transition-all group relative cursor-pointer" title="Chungi No 9: 38 students">
                <span className="opacity-0 group-hover:opacity-100 absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-mono bg-slate-900 px-1 rounded text-cyan-300">38</span>
              </div>
              <div className="flex-1 bg-blue-500/70 hover:bg-blue-500/90 h-18 rounded-t transition-all group relative cursor-pointer" title="Bosan Road: 52 students">
                <span className="opacity-0 group-hover:opacity-100 absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-mono bg-slate-900 px-1 rounded text-cyan-300">52</span>
              </div>
              <div className="flex-1 bg-blue-500/30 hover:bg-blue-500/50 h-12 rounded-t transition-all group relative cursor-pointer" title="Airport Road: 28 students">
                <span className="opacity-0 group-hover:opacity-100 absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-mono bg-slate-900 px-1 rounded text-cyan-300">28</span>
              </div>
              <div className="flex-1 bg-blue-500/80 hover:bg-blue-500 h-20 rounded-t transition-all group relative cursor-pointer" title="Mall Plaza: 58 students">
                <span className="opacity-0 group-hover:opacity-100 absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-mono bg-slate-900 px-1 rounded text-cyan-300">58</span>
              </div>
              <div className="flex-1 bg-blue-500/50 hover:bg-blue-500/70 h-16 rounded-t transition-all group relative cursor-pointer" title="Cantt Station: 42 students">
                <span className="opacity-0 group-hover:opacity-100 absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-mono bg-slate-900 px-1 rounded text-cyan-300">42</span>
              </div>
              <div className="flex-1 bg-blue-600 hover:bg-blue-400 h-full rounded-t transition-all group relative cursor-pointer" title="FAST Multan: Terminal Hub">
                <span className="opacity-0 group-hover:opacity-100 absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-mono bg-slate-900 px-1 rounded text-white">Hub</span>
              </div>
            </div>
            <div className="flex justify-between text-[9px] text-slate-500 mt-2 uppercase tracking-tighter font-mono">
              <span>BCG</span>
              <span>Chungi</span>
              <span>Bosan</span>
              <span>Airport</span>
              <span>Mall</span>
              <span>Cantt</span>
              <span>Campus</span>
            </div>
          </div>
        </div>
      </div>

      <RouteStopsModal
        route={stopsRoute}
        vehicle={stopsRoute ? vehicles.find((v) => v.id === stopsRoute.busId) : undefined}
        driver={stopsRoute ? drivers.find((d) => d.id === stopsRoute.driverId) : undefined}
        onClose={() => setStopsRouteId(null)}
      />
    </div>
  );
};
