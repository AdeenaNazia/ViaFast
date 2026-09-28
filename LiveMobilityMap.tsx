import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TransportRoute,
  ActiveTrip,
  Vehicle,
  RouteStop,
  TripType,
} from '../types';
import {
  Bus,
  MapPin,
  Play,
  Pause,
  RotateCcw,
  Gauge,
  Clock,
  Layers,
  Sparkles,
  AlertTriangle,
  Flame,
} from 'lucide-react';

interface LiveMobilityMapProps {
  routes: TransportRoute[];
  vehicles: Vehicle[];
  activeTrips: ActiveTrip[];
  selectedRouteId?: string;
  onSelectRoute?: (routeId: string) => void;
  tripType: TripType;
  onToggleTripType?: (type: TripType) => void;
  isSimulating: boolean;
  onToggleSimulation: () => void;
  simulationSpeed: number;
  onChangeSpeed: (speed: number) => void;
  onResetSimulation: () => void;
  showHeatmap?: boolean;
  onToggleHeatmap?: () => void;
  highlightedBusId?: string;
}

export const LiveMobilityMap: React.FC<LiveMobilityMapProps> = ({
  routes,
  vehicles,
  activeTrips,
  selectedRouteId,
  onSelectRoute,
  tripType,
  onToggleTripType,
  isSimulating,
  onToggleSimulation,
  simulationSpeed,
  onChangeSpeed,
  onResetSimulation,
  showHeatmap = false,
  onToggleHeatmap,
  highlightedBusId,
}) => {
  const [hoveredStop, setHoveredStop] = useState<{
    stop: RouteStop;
    route: TransportRoute;
    x: number;
    y: number;
  } | null>(null);
  const [hoveredBus, setHoveredBus] = useState<ActiveTrip | null>(null);

  // Multan Bounds
  const MIN_LAT = 30.170;
  const MAX_LAT = 30.275;
  const MIN_LNG = 71.430;
  const MAX_LNG = 71.525;

  // Project GPS to SVG ViewBox (1000 x 640)
  const project = (lat: number, lng: number): [number, number] => {
    const x = ((lng - MIN_LNG) / (MAX_LNG - MIN_LNG)) * 900 + 50;
    // Invert Y because latitude grows northward (upwards)
    const y = 640 - (((lat - MIN_LAT) / (MAX_LAT - MIN_LAT)) * 540 + 50);
    return [Math.max(30, Math.min(970, x)), Math.max(30, Math.min(610, y))];
  };

  const selectedRoute = routes.find((r) => r.id === selectedRouteId);

  return (
    <div id="live-mobility-map-container" className="relative w-full h-[520px] lg:h-[600px] bg-[#0f172a] rounded-2xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col">
      {/* Background Radar & Angled Grid Textures */}
      <div className="absolute inset-0 bg-grid-pattern pointer-events-none" />
      <div className="absolute inset-0 opacity-20 bg-angled-grid pointer-events-none" />

      {/* Top Map HUD Bar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center gap-2 bg-[#1e293b]/90 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-700 shadow-lg text-xs">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="font-semibold text-slate-200">
              Live Mobility Map
            </span>
            <span className="text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-400 border border-blue-800/50">
              {isSimulating ? 'Active Telemetry' : 'Paused'}
            </span>
          </div>

          {/* Direction toggle */}
          {onToggleTripType && (
            <div className="flex bg-[#1e293b]/90 backdrop-blur-md p-1 rounded-xl border border-slate-700 shadow text-xs">
              <button
                id="btn-map-trip-morning"
                onClick={() => onToggleTripType('morning')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  tripType === 'morning'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Morning Trip
              </button>
              <button
                id="btn-map-trip-return"
                onClick={() => onToggleTripType('return')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  tripType === 'return'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Return Trip
              </button>
            </div>
          )}
        </div>

        {/* Map Control Actions */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-[#1e293b]/90 backdrop-blur-md p-1 rounded-xl border border-slate-700 shadow">
          {onToggleHeatmap && (
            <button
              id="btn-map-toggle-heatmap"
              onClick={onToggleHeatmap}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                showHeatmap
                  ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle Stop Demand Heatmap"
            >
              <Flame className="w-3.5 h-3.5 text-blue-400" />
              <span>Demand Heatmap</span>
            </button>
          )}

          <div className="h-4 w-px bg-slate-700 mx-1" />

          {/* Play/Pause */}
          <button
            id="btn-map-toggle-sim"
            onClick={onToggleSimulation}
            className="p-1.5 text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            title={isSimulating ? 'Pause Transit' : 'Resume Transit'}
          >
            {isSimulating ? <Pause className="w-4 h-4 text-emerald-400" /> : <Play className="w-4 h-4 text-blue-400" />}
          </button>

          {/* Speeds */}
          {[1, 2, 5].map((speed) => (
            <button
              key={speed}
              id={`btn-map-speed-${speed}x`}
              onClick={() => onChangeSpeed(speed)}
              className={`px-1.5 py-0.5 text-[11px] font-mono rounded transition-all ${
                simulationSpeed === speed
                  ? 'bg-blue-600 text-white font-bold shadow-[0_0_8px_rgba(37,99,235,0.4)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {speed}x
            </button>
          ))}

          {/* Reset */}
          <button
            id="btn-map-reset-sim"
            onClick={onResetSimulation}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            title="Reset to Initial Coordinates"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SVG Canvas Map */}
      <div className="relative w-full flex-1 overflow-hidden">
        <svg
          viewBox="0 0 1000 640"
          className="w-full h-full select-none cursor-grab active:cursor-grabbing"
          style={{ background: 'radial-gradient(circle at 50% 50%, #091224 0%, #030712 100%)' }}
        >
          <defs>
            {/* Subtle Grid Pattern */}
            <pattern id="grid-pattern" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.4" />
            </pattern>

            {/* Glowing Bus Marker Filters */}
            <filter id="cyan-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="campus-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Grid */}
          <rect width="1000" height="640" fill="url(#grid-pattern)" />

          {/* Arterial Road Context Hint Lines */}
          <g stroke="#1e293b" strokeWidth="2" strokeDasharray="4 6" opacity="0.4">
            <line x1="80" y1="480" x2="900" y2="120" />
            <line x1="300" y1="560" x2="750" y2="80" />
            <line x1="120" y1="200" x2="880" y2="400" />
          </g>

          {/* Campus Marker at Northern End */}
          {(() => {
            const [cx, cy] = project(30.2640, 71.5120);
            return (
              <g id="map-campus-marker" className="cursor-pointer">
                {/* Pulse Ring */}
                <circle cx={cx} cy={cy} r="28" fill="#38bdf8" fillOpacity="0.1" filter="url(#campus-glow)">
                  <animate attributeName="r" values="20;32;20" dur="3s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.3;0.05;0.3" dur="3s" repeatCount="indefinite" />
                </circle>
                <circle cx={cx} cy={cy} r="14" fill="#0284c7" stroke="#38bdf8" strokeWidth="2" />
                <text x={cx} y={cy - 20} textAnchor="middle" fill="#7dd3fc" fontSize="11" fontWeight="700" letterSpacing="0.5">
                  CAMPUS TERMINAL
                </text>
                <text x={cx} y={cy + 4} textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="800">
                  FAST
                </text>
              </g>
            );
          })()}

          {/* Route Paths */}
          {routes.map((route) => {
            const isSelected = !selectedRouteId || selectedRouteId === route.id;
            const points = route.stops.map((s) => project(s.lat, s.lng));
            const pathD = points.reduce((acc, pt, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${pt[0]} ${pt[1]}`, '');

            return (
              <g
                key={route.id}
                id={`map-route-path-${route.id}`}
                className="transition-opacity duration-300"
                opacity={isSelected ? 1 : 0.2}
                onClick={() => onSelectRoute && onSelectRoute(route.id)}
              >
                {/* Outer Glow Path */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={route.color}
                  strokeWidth={isSelected ? '6' : '3'}
                  strokeOpacity="0.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Core Path Line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={route.color}
                  strokeWidth={isSelected ? '3' : '2'}
                  strokeDasharray={isSelected ? 'none' : '6 4'}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            );
          })}

          {/* Stop Nodes */}
          {routes.map((route) => {
            const isSelected = !selectedRouteId || selectedRouteId === route.id;
            if (!isSelected) return null;

            return (
              <g key={`stops-${route.id}`}>
                {route.stops.map((stop, sIdx) => {
                  const [sx, sy] = project(stop.lat, stop.lng);
                  const isDestination = sIdx === route.stops.length - 1;
                  if (isDestination) return null; // campus marker already rendered

                  return (
                    <g
                      key={stop.id}
                      id={`map-stop-${stop.id}`}
                      className="cursor-pointer group"
                      onMouseEnter={() => setHoveredStop({ stop, route, x: sx, y: sy })}
                      onMouseLeave={() => setHoveredStop(null)}
                    >
                      {/* Heatmap Aura if enabled */}
                      {showHeatmap && stop.demand > 0 && (
                        <circle
                          cx={sx}
                          cy={sy}
                          r={Math.min(30, 8 + stop.demand * 4)}
                          fill={stop.demand >= 4 ? '#ef4444' : stop.demand >= 2 ? '#f59e0b' : '#3b82f6'}
                          fillOpacity="0.25"
                        >
                          <animate attributeName="opacity" values="0.15;0.35;0.15" dur="2.5s" repeatCount="indefinite" />
                        </circle>
                      )}

                      {/* Base Stop Dot */}
                      <circle
                        cx={sx}
                        cy={sy}
                        r="5.5"
                        fill="#0f172a"
                        stroke={route.color}
                        strokeWidth="2"
                        className="transition-transform group-hover:scale-125"
                      />
                      <circle cx={sx} cy={sy} r="2.5" fill="#f8fafc" />

                      {/* Demand count badge if > 1 */}
                      {stop.demand > 1 && (
                        <g transform={`translate(${sx + 6}, ${sy - 8})`}>
                          <rect width="14" height="12" rx="3" fill="#1e293b" stroke={route.color} strokeWidth="1" />
                          <text x="7" y="9" textAnchor="middle" fill="#38bdf8" fontSize="8" fontWeight="700">
                            {stop.demand}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* Active Moving Buses */}
          {activeTrips.map((trip) => {
            const route = routes.find((r) => r.id === trip.routeId);
            const vehicle = vehicles.find((v) => v.id === trip.busId);
            if (!route || !vehicle) return null;

            const isHighlighted = highlightedBusId === vehicle.id;
            const [bx, by] = project(trip.currentLat, trip.currentLng);

            return (
              <g
                key={trip.id}
                id={`map-bus-marker-${trip.id}`}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredBus(trip)}
                onMouseLeave={() => setHoveredBus(null)}
                onClick={() => onSelectRoute && onSelectRoute(route.id)}
              >
                {/* Ping animation for active bus */}
                <circle cx={bx} cy={by} r="18" fill={route.color} fillOpacity="0.2">
                  <animate attributeName="r" values="12;24;12" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.4;0.1;0.4" dur="2s" repeatCount="indefinite" />
                </circle>

                {/* Bus Body */}
                <rect
                  x={bx - 14}
                  y={by - 12}
                  width="28"
                  height="24"
                  rx="6"
                  fill="#090d16"
                  stroke={isHighlighted ? '#f59e0b' : route.color}
                  strokeWidth={isHighlighted ? '3' : '2'}
                  filter="url(#cyan-glow)"
                />

                {/* Bus Icon */}
                <foreignObject x={bx - 8} y={by - 8} width="16" height="16">
                  <div className="flex items-center justify-center text-white">
                    <Bus className="w-3.5 h-3.5" style={{ color: route.color }} />
                  </div>
                </foreignObject>

                {/* Vehicle Label Pill */}
                <g transform={`translate(${bx}, ${by - 20})`}>
                  <rect
                    x="-32"
                    y="-12"
                    width="64"
                    height="14"
                    rx="4"
                    fill="#0f172a"
                    stroke="#334155"
                    strokeWidth="1"
                    opacity="0.95"
                  />
                  <text x="0" y="-2" textAnchor="middle" fill="#e2e8f0" fontSize="8.5" fontWeight="600">
                    {vehicle.vehicleNumber.replace('Coaster # ', 'C-').replace('Bus # ', 'B-')}
                  </text>
                </g>

                {/* Speed & Delay Indicator */}
                {trip.delayMinutes > 3 && (
                  <g transform={`translate(${bx + 14}, ${by - 12})`}>
                    <circle cx="0" cy="0" r="6" fill="#ef4444" />
                    <text x="0" y="3" textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="800">
                      !
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip for Stops */}
        <AnimatePresence>
          {hoveredStop && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute z-30 pointer-events-none bg-slate-900/95 border border-slate-700/80 p-3 rounded-xl shadow-2xl backdrop-blur-md min-w-[200px]"
              style={{
                left: `${(hoveredStop.x / 1000) * 100}%`,
                top: `${(hoveredStop.y / 640) * 100}%`,
                transform: 'translate(-50%, -115%)',
              }}
            >
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5 mb-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400">
                  Stop #{hoveredStop.stop.sequence}
                </span>
                <span className="text-[10px] font-semibold text-slate-400">
                  {(hoveredStop.route.name || `Route ${hoveredStop.route.routeNumber}`).split(':')[0]}
                </span>
              </div>
              <h4 className="text-xs font-bold text-white mb-1">{hoveredStop.stop.name}</h4>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase">Morning</span>
                  <span className="font-mono text-cyan-300">{hoveredStop.stop.morningTime}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase">Demand</span>
                  <span className="font-semibold text-emerald-400">{hoveredStop.stop.demand} students</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hover Tooltip for Bus */}
        <AnimatePresence>
          {hoveredBus && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute z-30 pointer-events-none bg-slate-900/95 border border-cyan-500/40 p-3 rounded-xl shadow-2xl backdrop-blur-md min-w-[220px]"
              style={{
                left: `${(project(hoveredBus.currentLat, hoveredBus.currentLng)[0] / 1000) * 100}%`,
                top: `${(project(hoveredBus.currentLat, hoveredBus.currentLng)[1] / 640) * 100}%`,
                transform: 'translate(-50%, -115%)',
              }}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
                <span className="text-xs font-bold text-white">
                  {vehicles.find((v) => v.id === hoveredBus.busId)?.vehicleNumber}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                  hoveredBus.delayMinutes > 3 ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                }`}>
                  {hoveredBus.delayMinutes > 3 ? `+${hoveredBus.delayMinutes}m Delayed` : 'On Time'}
                </span>
              </div>
              <div className="text-[11px] space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Current Speed:</span>
                  <span className="font-mono text-cyan-300">{hoveredBus.speedKmh} km/h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Progress:</span>
                  <span className="font-mono text-emerald-300">{hoveredBus.progressPercent}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Traffic:</span>
                  <span className="text-amber-300">{hoveredBus.trafficLevel}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Immersive Floating Bottom Telemetry HUD */}
        <div className="absolute bottom-4 left-4 z-20 hidden md:flex items-center gap-5 bg-[#1e293b]/90 backdrop-blur-xl px-4 py-2 rounded-xl border border-slate-700 shadow-2xl pointer-events-none">
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-400 uppercase tracking-widest font-mono">Current Activity</span>
            <div className="flex items-end gap-1.5">
              <span className="text-base font-bold text-white font-mono">{activeTrips.length * 8 + 2}</span>
              <span className="text-[10px] text-slate-500 font-mono mb-0.5">Trips/Day</span>
            </div>
          </div>
          <div className="w-px h-6 bg-slate-700" />
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-400 uppercase tracking-widest font-mono">On-Time Rate</span>
            <div className="flex items-end gap-1.5">
              <span className="text-base font-bold text-emerald-400 font-mono">96.4%</span>
              <span className="text-[10px] text-emerald-400 font-mono mb-0.5">↑ 2%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Route Selector Strip */}
      <div className="px-3 py-2 bg-[#0f172a] border-t border-slate-800 flex items-center justify-between gap-2 overflow-x-auto text-xs z-20">
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            id="btn-filter-all-routes"
            onClick={() => onSelectRoute && onSelectRoute('')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              !selectedRouteId
                ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.3)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Corridors ({routes.length})
          </button>
          {routes.map((route) => {
            const isSelected = selectedRouteId === route.id;
            return (
              <button
                key={route.id}
                id={`btn-filter-route-${route.id}`}
                onClick={() => onSelectRoute && onSelectRoute(route.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all ${
                  isSelected
                    ? 'bg-slate-800 text-white border border-slate-600 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: route.color }} />
                <span>R-{route.routeNumber}</span>
              </button>
            );
          })}
        </div>

        <div className="text-[11px] text-slate-400 font-mono shrink-0 hidden sm:block">
          FAST Multan Transit Grid • 2026 Academic Fleet
        </div>
      </div>
    </div>
  );
};
