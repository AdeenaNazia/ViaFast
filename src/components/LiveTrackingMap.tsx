import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bus, MapPin, Play, Pause, RotateCcw, Flame, Plus, Minus, Crosshair, Navigation } from 'lucide-react';
import type { TransportRoute, TripType } from '../types';
import type { DataFreshness, VehicleTracking, StopInfo } from '../tracking/types';
import { TRACKING_STATUS_META, FRESHNESS_META } from '../tracking/status';

interface LiveTrackingMapProps {
  routes: TransportRoute[];
  /** Normalized tracking records — the map never touches raw ActiveTrip/Vehicle. */
  vehicles: VehicleTracking[];
  tripType: TripType;

  selectedVehicleId?: string;
  onSelectVehicle?: (vehicleId: string) => void;
  selectedRouteId?: string;
  onSelectRoute?: (routeId: string) => void;
  /** Rider's own pickup/drop stop — drawn as an accent "YOUR STOP" ring. */
  focusStopId?: string;
  /** If set, the map keeps this vehicle centred until the user pans manually. */
  followVehicleId?: string;

  showViewControls?: boolean;
  showRouteFilter?: boolean;
  showLegend?: boolean;
  showTelemetryHud?: boolean;
  showHeatmap?: boolean;
  onToggleHeatmap?: () => void;
  onToggleTripType?: (type: TripType) => void;
  isSimulating?: boolean;
  onToggleSimulation?: () => void;
  simulationSpeed?: number;
  onChangeSpeed?: (speed: number) => void;
  onResetSimulation?: () => void;
  /** Fleet-level freshness chip (category only). */
  dataFreshness?: DataFreshness;
  title?: string;
  heightClass?: string;
  className?: string;
}

// Multan bounds (SVG lat/lng projection, not a tile map — deliberately preserved).
const MIN_LAT = 30.17;
const MAX_LAT = 30.275;
const MIN_LNG = 71.43;
const MAX_LNG = 71.525;
const VIEW_W = 1000;
const VIEW_H = 640;
const MIN_VIEW_W = 260;

function project(lat: number, lng: number): [number, number] {
  const x = ((lng - MIN_LNG) / (MAX_LNG - MIN_LNG)) * 900 + 50;
  const y = VIEW_H - (((lat - MIN_LAT) / (MAX_LAT - MIN_LAT)) * 540 + 50);
  return [Math.max(30, Math.min(970, x)), Math.max(30, Math.min(610, y))];
}

interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

const FULL_VIEW: ViewBox = { x: 0, y: 0, w: VIEW_W, h: VIEW_H };

function clampView(v: ViewBox): ViewBox {
  const w = Math.max(MIN_VIEW_W, Math.min(VIEW_W, v.w));
  const h = w * (VIEW_H / VIEW_W);
  const x = Math.max(0, Math.min(VIEW_W - w, v.x));
  const y = Math.max(0, Math.min(VIEW_H - h, v.y));
  return { x, y, w, h };
}

/**
 * Reusable live-tracking map. It is presentation only: every position, status
 * and stop comes from the provider-agnostic `VehicleTracking` model, so a real
 * GPS provider can feed it later without touching this component. The SVG
 * lat/lng projection is intentionally kept (not a geographic tile map); the
 * tracking API is what would be re-pointed at a real map.
 *
 * Smooth movement is done with a CSS `transform` transition on each marker
 * group — no animation loop is started here because the simulation already
 * emits updates; the transition just interpolates between them.
 */
export const LiveTrackingMap: React.FC<LiveTrackingMapProps> = ({
  routes,
  vehicles,
  tripType,
  selectedVehicleId,
  onSelectVehicle,
  selectedRouteId,
  onSelectRoute,
  focusStopId,
  followVehicleId,
  showViewControls = true,
  showRouteFilter,
  showLegend = true,
  showTelemetryHud = false,
  showHeatmap = false,
  onToggleHeatmap,
  onToggleTripType,
  isSimulating,
  onToggleSimulation,
  simulationSpeed = 1,
  onChangeSpeed,
  onResetSimulation,
  dataFreshness = 'LIVE',
  title = 'Live Tracking Map',
  heightClass = 'h-[520px] lg:h-[600px]',
  className = '',
}) => {
  const showFilter = showRouteFilter ?? routes.length > 1;

  const [view, setView] = useState<ViewBox>(FULL_VIEW);
  const [hoveredStop, setHoveredStop] = useState<{
    stop: StopInfo;
    routeName: string;
    x: number;
    y: number;
  } | null>(null);
  const [hoveredVehicle, setHoveredVehicle] = useState<VehicleTracking | null>(null);
  const [followEnabled, setFollowEnabled] = useState(!!followVehicleId);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const dragMovedRef = useRef(false);

  // Interpolation duration mirrors the simulation tick so buses glide instead of jumping.
  const transitionMs = Math.max(800, Math.round(2400 / (simulationSpeed || 1)));

  // Primary vehicle whose current/next stops we annotate.
  const primary =
    vehicles.find((v) => v.vehicleId === (selectedVehicleId ?? followVehicleId)) ??
    (vehicles.length === 1 ? vehicles[0] : undefined);

  // ---- Zoom -------------------------------------------------------------
  const zoomBy = useCallback((factor: number, centerX?: number, centerY?: number) => {
    setView((prev) => {
      const w = prev.w * factor;
      if (w < MIN_VIEW_W || w > VIEW_W) return prev;
      const cx = centerX ?? prev.x + prev.w / 2;
      const cy = centerY ?? prev.y + prev.h / 2;
      const h = w * (VIEW_H / VIEW_W);
      const ratio = w / prev.w;
      return clampView({
        w,
        h,
        x: cx - (cx - prev.x) * ratio,
        y: cy - (cy - prev.y) * ratio,
      });
    });
  }, []);

  const recenter = useCallback(() => {
    setView(FULL_VIEW);
    setFollowEnabled(false);
  }, []);

  // Wheel zoom (non-passive so we can preventDefault the page scroll).
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * VIEW_W;
      const py = ((e.clientY - rect.top) / rect.height) * VIEW_H;
      const cx = view.x + (px / VIEW_W) * view.w;
      const cy = view.y + (py / VIEW_H) * view.h;
      zoomBy(e.deltaY > 0 ? 1.15 : 0.87, cx, cy);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [view, zoomBy]);

  // ---- Pan (pointer drag) ----------------------------------------------
  const toSvgDelta = useCallback(
    (dxPx: number, dyPx: number): [number, number] => {
      const el = svgRef.current;
      if (!el) return [0, 0];
      const rect = el.getBoundingClientRect();
      return [(dxPx / rect.width) * view.w, (dyPx / rect.height) * view.h];
    },
    [view]
  );

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    dragRef.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
    dragMovedRef.current = false;
    (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      dragMovedRef.current = true;
      setFollowEnabled(false);
    }
    const [sx, sy] = toSvgDelta(dx, dy);
    setView((prev) => clampView({ ...prev, x: dragRef.current!.vx - sx, y: dragRef.current!.vy - sy }));
  };
  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    dragRef.current = null;
    try {
      (e.currentTarget as SVGSVGElement).releasePointerCapture(e.pointerId);
    } catch {
      /* pointer already released */
    }
  };

  // ---- Follow vehicle ---------------------------------------------------
  const followTarget = followVehicleId
    ? vehicles.find((v) => v.vehicleId === followVehicleId)
    : undefined;
  useEffect(() => {
    if (!followEnabled || !followTarget) return;
    const [fx, fy] = project(followTarget.position.lat, followTarget.position.lng);
    setView((prev) => clampView({ ...prev, x: fx - prev.w / 2, y: fy - prev.h / 2 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followEnabled, followTarget?.position.lat, followTarget?.position.lng]);

  const toggleFollow = () => {
    if (!followVehicleId) return;
    setFollowEnabled((f) => !f);
  };

  // Convert an SVG-space point to container % (tooltip positioning under zoom).
  const toContainerPercent = useCallback(
    ([x, y]: [number, number]): { left: string; top: string } => ({
      left: `${((x - view.x) / view.w) * 100}%`,
      top: `${((y - view.y) / view.h) * 100}%`,
    }),
    [view]
  );

  const freshnessMeta = FRESHNESS_META[dataFreshness];
  const visibleRoutes = selectedRouteId
    ? routes.filter((r) => r.id === selectedRouteId)
    : routes;

  const stopNameById = useMemo(() => {
    const m = new Map<string, { name: string; sequence: number }>();
    routes.forEach((r) => r.stops.forEach((s) => m.set(s.id, { name: s.name, sequence: s.sequence })));
    return m;
  }, [routes]);

  return (
    <div
      id="live-mobility-map-container"
      className={`relative w-full ${heightClass} bg-[#0f172a] rounded-2xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col ${className}`}
    >
      <div className="absolute inset-0 bg-grid-pattern pointer-events-none" />
      <div className="absolute inset-0 opacity-20 bg-angled-grid pointer-events-none" />

      {/* Top HUD */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center gap-2 bg-[#1e293b]/90 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-700 shadow-lg text-xs">
            <span className={`w-2 h-2 rounded-full ${freshnessMeta.dotClass} ${dataFreshness === 'LIVE' ? 'animate-pulse' : ''}`} />
            <span className="font-semibold text-slate-200">{title}</span>
            <span className={`text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border ${freshnessMeta.chipClass}`}>
              {freshnessMeta.label}
            </span>
          </div>

          {onToggleTripType && (
            <div className="flex bg-[#1e293b]/90 backdrop-blur-md p-1 rounded-xl border border-slate-700 shadow text-xs">
              <button
                id="btn-map-trip-morning"
                onClick={() => onToggleTripType('morning')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  tripType === 'morning' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Morning Trip
              </button>
              <button
                id="btn-map-trip-return"
                onClick={() => onToggleTripType('return')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  tripType === 'return' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Return Trip
              </button>
            </div>
          )}
        </div>

        {/* Sim / heatmap controls */}
        {(onToggleHeatmap || onToggleSimulation || onResetSimulation) && (
          <div className="flex items-center gap-1.5 pointer-events-auto bg-[#1e293b]/90 backdrop-blur-md p-1 rounded-xl border border-slate-700 shadow">
            {onToggleHeatmap && (
              <button
                id="btn-map-toggle-heatmap"
                onClick={onToggleHeatmap}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  showHeatmap ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Toggle Stop Demand Heatmap"
              >
                <Flame className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Heatmap</span>
              </button>
            )}

            {onToggleSimulation && (
              <>
                {onToggleHeatmap && <div className="h-4 w-px bg-slate-700 mx-1" />}
                <button
                  id="btn-map-toggle-sim"
                  onClick={onToggleSimulation}
                  className="p-1.5 text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                  title={isSimulating ? 'Pause Transit' : 'Resume Transit'}
                >
                  {isSimulating ? <Pause className="w-4 h-4 text-emerald-400" /> : <Play className="w-4 h-4 text-blue-400" />}
                </button>
              </>
            )}

            {onChangeSpeed &&
              [1, 2, 5].map((speed) => (
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

            {onResetSimulation && (
              <button
                id="btn-map-reset-sim"
                onClick={onResetSimulation}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                title="Reset to Initial Coordinates"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* SVG canvas */}
      <div className="relative w-full flex-1 overflow-hidden">
        <svg
          ref={svgRef}
          viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
          className="w-full h-full select-none cursor-grab active:cursor-grabbing touch-none"
          style={{ background: 'radial-gradient(circle at 50% 50%, #091224 0%, #030712 100%)' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <defs>
            <pattern id="grid-pattern" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.4" />
            </pattern>
            <filter id="cyan-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="campus-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          <rect width={VIEW_W} height={VIEW_H} fill="url(#grid-pattern)" />

          {/* Arterial context lines */}
          <g stroke="#1e293b" strokeWidth="2" strokeDasharray="4 6" opacity="0.4">
            <line x1="80" y1="480" x2="900" y2="120" />
            <line x1="300" y1="560" x2="750" y2="80" />
            <line x1="120" y1="200" x2="880" y2="400" />
          </g>

          {/* Campus marker */}
          {(() => {
            const [cx, cy] = project(30.264, 71.512);
            return (
              <g id="map-campus-marker">
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

          {/* Route paths */}
          {visibleRoutes.map((route) => {
            const points = route.stops.map((s) => project(s.lat, s.lng));
            const pathD = points.reduce((acc, pt, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${pt[0]} ${pt[1]}`, '');
            return (
              <g
                key={route.id}
                id={`map-route-path-${route.id}`}
                className="transition-opacity duration-300"
                onClick={() => !dragMovedRef.current && onSelectRoute && onSelectRoute(route.id)}
              >
                <path d={pathD} fill="none" stroke={route.color} strokeWidth="6" strokeOpacity="0.25" strokeLinecap="round" strokeLinejoin="round" />
                <path d={pathD} fill="none" stroke={route.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            );
          })}

          {/* Stop nodes */}
          {visibleRoutes.map((route) => (
            <g key={`stops-${route.id}`}>
              {route.stops.map((stop, sIdx) => {
                const isDestination = sIdx === route.stops.length - 1;
                if (isDestination) return null;
                const [sx, sy] = project(stop.lat, stop.lng);
                const isFocus = focusStopId === stop.id;
                return (
                  <g
                    key={stop.id}
                    id={`map-stop-${stop.id}`}
                    className="cursor-pointer group"
                    onMouseEnter={() =>
                      setHoveredStop({
                        stop: { id: stop.id, sequence: stop.sequence, name: stop.name, point: { lat: stop.lat, lng: stop.lng } },
                        routeName: (route.name || `Route ${route.routeNumber}`).split(':')[0],
                        x: sx,
                        y: sy,
                      })
                    }
                    onMouseLeave={() => setHoveredStop(null)}
                  >
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
                    {isFocus && (
                      <circle cx={sx} cy={sy} r="13" fill="none" stroke="#f472b6" strokeWidth="2.5" strokeDasharray="3 3">
                        <animate attributeName="r" values="11;16;11" dur="2s" repeatCount="indefinite" />
                      </circle>
                    )}
                    <circle cx={sx} cy={sy} r="5.5" fill="#0f172a" stroke={isFocus ? '#f472b6' : route.color} strokeWidth="2" className="transition-transform group-hover:scale-125" />
                    <circle cx={sx} cy={sy} r="2.5" fill="#f8fafc" />
                    {isFocus && (
                      <text x={sx} y={sy - 17} textAnchor="middle" fill="#f9a8d4" fontSize="8" fontWeight="800" letterSpacing="0.5">
                        YOUR STOP
                      </text>
                    )}
                    {stop.demand > 1 && !isFocus && (
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
          ))}

          {/* Current / next stop rings for the primary vehicle */}
          {primary && (
            <g>
              {primary.currentStop &&
                (() => {
                  const [cx, cy] = project(primary.currentStop.point.lat, primary.currentStop.point.lng);
                  return (
                    <g id={`map-current-stop-${primary.vehicleId}`}>
                      <circle cx={cx} cy={cy} r="11" fill="none" stroke="#22c55e" strokeWidth="2.5" />
                      <text x={cx} y={cy - 15} textAnchor="middle" fill="#4ade80" fontSize="8" fontWeight="800" letterSpacing="0.5">
                        NOW
                      </text>
                    </g>
                  );
                })()}
              {primary.nextStop &&
                (() => {
                  const [nx, ny] = project(primary.nextStop.point.lat, primary.nextStop.point.lng);
                  return (
                    <g id={`map-next-stop-${primary.vehicleId}`}>
                      <circle cx={nx} cy={ny} r="11" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="4 3" />
                      <text x={nx} y={ny - 15} textAnchor="middle" fill="#fbbf24" fontSize="8" fontWeight="800" letterSpacing="0.5">
                        NEXT
                      </text>
                    </g>
                  );
                })()}
            </g>
          )}

          {/* Vehicle markers — smooth CSS-transform interpolation between fixes */}
          {vehicles.map((v) => {
            const [bx, by] = project(v.position.lat, v.position.lng);
            const meta = TRACKING_STATUS_META[v.status];
            const isSelected = selectedVehicleId === v.vehicleId;
            const isOffline = v.status === 'OFFLINE';

            return (
              <g
                key={v.vehicleId}
                id={`map-bus-marker-${v.tripId}`}
                className="cursor-pointer"
                style={{
                  transform: `translate(${bx}px, ${by}px)`,
                  transition: `transform ${transitionMs}ms linear`,
                }}
                onMouseEnter={() => setHoveredVehicle(v)}
                onMouseLeave={() => setHoveredVehicle(null)}
                onClick={() => {
                  if (dragMovedRef.current) return;
                  onSelectVehicle ? onSelectVehicle(v.vehicleId) : onSelectRoute && onSelectRoute(v.routeId);
                }}
                opacity={isOffline ? 0.55 : 1}
              >
                {/* Active ping */}
                {v.status === 'ACTIVE' && (
                  <circle r="18" fill={v.color} fillOpacity="0.2">
                    <animate attributeName="r" values="12;24;12" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.4;0.1;0.4" dur="2s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* Selection ring */}
                {isSelected && <circle r="22" fill="none" stroke="#f8fafc" strokeWidth="2" strokeOpacity="0.9" />}

                {/* Body (dashed when offline so state is not colour-only) */}
                <rect
                  x={-14}
                  y={-12}
                  width="28"
                  height="24"
                  rx="6"
                  fill="#090d16"
                  stroke={isSelected ? '#f59e0b' : v.color}
                  strokeWidth={isSelected ? 3 : 2}
                  strokeDasharray={isOffline ? '4 3' : 'none'}
                  filter="url(#cyan-glow)"
                />

                <foreignObject x={-8} y={-8} width="16" height="16">
                  <div className="flex items-center justify-center">
                    <Bus className="w-3.5 h-3.5" style={{ color: isOffline ? '#64748b' : v.color }} />
                  </div>
                </foreignObject>

                {/* Status badge glyph — distinct shape/icon per status */}
                <g transform="translate(14, -12)">
                  {v.status === 'ACTIVE' && <circle r="6" fill="#22c55e" />}
                  {v.status === 'STOPPED' && (
                    <>
                      <circle r="6" fill="#0ea5e9" />
                      <rect x="-2.5" y="-3" width="1.8" height="6" fill="#0b1220" />
                      <rect x="0.7" y="-3" width="1.8" height="6" fill="#0b1220" />
                    </>
                  )}
                  {v.status === 'DELAYED' && (
                    <>
                      <circle r="6" fill="#f59e0b" />
                      <text x="0" y="3" textAnchor="middle" fill="#1f2937" fontSize="8" fontWeight="900">
                        !
                      </text>
                    </>
                  )}
                  {v.status === 'COMPLETED' && (
                    <>
                      <circle r="6" fill="#a855f7" />
                      <text x="0" y="3" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="900">
                        ✓
                      </text>
                    </>
                  )}
                  {v.status === 'OFFLINE' && (
                    <>
                      <circle r="6" fill="#475569" />
                      <text x="0" y="3" textAnchor="middle" fill="#e2e8f0" fontSize="8" fontWeight="900">
                        ?
                      </text>
                    </>
                  )}
                </g>

                {/* Label pill: vehicle + status text (not colour alone) */}
                <g transform="translate(0, -20)">
                  <rect x={isSelected ? -46 : -34} y="-13" width={isSelected ? 92 : 68} height="15" rx="4" fill="#0f172a" stroke={isSelected ? '#f59e0b' : '#334155'} strokeWidth="1" opacity="0.95" />
                  <text x="0" y="-2" textAnchor="middle" fill="#e2e8f0" fontSize="8.5" fontWeight="700">
                    {isSelected ? `${v.vehicleLabel} • ${meta.short}` : v.vehicleLabel}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>

        {/* Stop tooltip */}
        <AnimatePresence>
          {hoveredStop && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute z-30 pointer-events-none bg-slate-900/95 border border-slate-700/80 p-3 rounded-xl shadow-2xl backdrop-blur-md min-w-[190px]"
              style={{ ...toContainerPercent([hoveredStop.x, hoveredStop.y]), transform: 'translate(-50%, -115%)' }}
            >
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5 mb-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400">Stop #{hoveredStop.stop.sequence}</span>
                <span className="text-[10px] font-semibold text-slate-400">{hoveredStop.routeName}</span>
              </div>
              <h4 className="text-xs font-bold text-white">{hoveredStop.stop.name}</h4>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Vehicle tooltip */}
        <AnimatePresence>
          {hoveredVehicle && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute z-30 pointer-events-none bg-slate-900/95 border border-cyan-500/40 p-3 rounded-xl shadow-2xl backdrop-blur-md min-w-[220px]"
              style={{
                ...toContainerPercent(project(hoveredVehicle.position.lat, hoveredVehicle.position.lng)),
                transform: 'translate(-50%, -115%)',
              }}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
                <span className="text-xs font-bold text-white">{hoveredVehicle.vehicleNumber}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border ${TRACKING_STATUS_META[hoveredVehicle.status].chipClass}`}>
                  {TRACKING_STATUS_META[hoveredVehicle.status].short}
                </span>
              </div>
              <div className="text-[11px] space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Next stop:</span>
                  <span className="font-medium text-slate-200">{hoveredVehicle.nextStop?.name ?? 'Campus'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">ETA:</span>
                  <span className="font-mono text-cyan-300">{hoveredVehicle.etaMinutes} min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Speed:</span>
                  <span className="font-mono text-cyan-300">{hoveredVehicle.speedKmh} km/h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Traffic:</span>
                  <span className="text-amber-300">{hoveredVehicle.trafficLevel}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* View controls (zoom / recenter / follow) */}
        {showViewControls && (
          <div className="absolute bottom-4 right-3 z-20 flex flex-col gap-1.5">
            <button
              id="btn-map-zoom-in"
              onClick={() => zoomBy(0.8)}
              className="p-2 rounded-lg bg-[#1e293b]/90 backdrop-blur border border-slate-700 text-slate-200 hover:bg-slate-700 transition-colors shadow-lg"
              title="Zoom in"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              id="btn-map-zoom-out"
              onClick={() => zoomBy(1.25)}
              className="p-2 rounded-lg bg-[#1e293b]/90 backdrop-blur border border-slate-700 text-slate-200 hover:bg-slate-700 transition-colors shadow-lg"
              title="Zoom out"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              id="btn-map-recenter"
              onClick={recenter}
              className="p-2 rounded-lg bg-[#1e293b]/90 backdrop-blur border border-slate-700 text-slate-200 hover:bg-slate-700 transition-colors shadow-lg"
              title="Recenter map"
            >
              <Crosshair className="w-4 h-4" />
            </button>
            {followVehicleId && (
              <button
                id="btn-map-follow"
                onClick={toggleFollow}
                className={`p-2 rounded-lg backdrop-blur border transition-colors shadow-lg ${
                  followEnabled
                    ? 'bg-emerald-600/30 border-emerald-500/60 text-emerald-300'
                    : 'bg-[#1e293b]/90 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
                title={followEnabled ? 'Following vehicle' : 'Follow vehicle'}
              >
                <Navigation className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Legend — status shown with icon + label, never colour alone */}
        {showLegend && (
          <div className="absolute bottom-4 left-4 z-20 hidden md:flex flex-wrap items-center gap-3 bg-[#1e293b]/90 backdrop-blur-xl px-3 py-2 rounded-xl border border-slate-700 shadow-2xl pointer-events-none max-w-[60%]">
            {(Object.keys(TRACKING_STATUS_META) as Array<keyof typeof TRACKING_STATUS_META>).map((key) => {
              const m = TRACKING_STATUS_META[key];
              return (
                <span key={key} className="flex items-center gap-1.5 text-[10px] font-mono text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.accent }} />
                  {m.short}
                </span>
              );
            })}
          </div>
        )}

        {/* Optional telemetry HUD */}
        {showTelemetryHud && (
          <div className="absolute top-16 left-4 z-20 hidden lg:flex items-center gap-5 bg-[#1e293b]/90 backdrop-blur-xl px-4 py-2 rounded-xl border border-slate-700 shadow-2xl pointer-events-none">
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-400 uppercase tracking-widest font-mono">Tracked</span>
              <span className="text-base font-bold text-white font-mono">{vehicles.length}</span>
            </div>
            <div className="w-px h-6 bg-slate-700" />
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-400 uppercase tracking-widest font-mono">Active</span>
              <span className="text-base font-bold text-emerald-400 font-mono">
                {vehicles.filter((v) => v.status === 'ACTIVE').length}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Corridor filter strip */}
      {showFilter && (
        <div className="px-3 py-2 bg-[#0f172a] border-t border-slate-800 flex items-center justify-between gap-2 overflow-x-auto text-xs z-20">
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              id="btn-filter-all-routes"
              onClick={() => onSelectRoute && onSelectRoute('')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                !selectedRouteId ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.3)]' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Corridors ({routes.length})
            </button>
            {routes.map((route) => {
              const isSel = selectedRouteId === route.id;
              return (
                <button
                  key={route.id}
                  id={`btn-filter-route-${route.id}`}
                  onClick={() => onSelectRoute && onSelectRoute(route.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all ${
                    isSel ? 'bg-slate-800 text-white border border-slate-600 shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: route.color }} />
                  <span>R-{route.routeNumber}</span>
                </button>
              );
            })}
          </div>
          <div className="text-[11px] text-slate-400 font-mono shrink-0 hidden sm:block">
            FAST Multan Transit Grid • {stopNameById.size} stops
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(LiveTrackingMap);
