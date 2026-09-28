import React, { useState } from 'react';
import { TransportRoute, Vehicle, Student, WhatIfCalculation } from '../types';
import { simulateWhatIf } from '../utils/aiEngines';
import {
  Sparkles,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Clock,
  ArrowRight,
  X,
  Zap,
} from 'lucide-react';

interface AIWhatIfModalProps {
  isOpen: boolean;
  onClose: () => void;
  routes: TransportRoute[];
  vehicles: Vehicle[];
  students: Student[];
  onApplyAction?: (calculation: WhatIfCalculation) => void;
}

export const AIWhatIfModal: React.FC<AIWhatIfModalProps> = ({
  isOpen,
  onClose,
  routes,
  vehicles,
  students,
  onApplyAction,
}) => {
  const [scenarioType, setScenarioType] = useState('demand_spike');
  const [paramNumber, setParamNumber] = useState(25);

  if (!isOpen) return null;

  const result: WhatIfCalculation = simulateWhatIf(
    scenarioType,
    paramNumber,
    routes,
    vehicles,
    students
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800/60">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">AI What-If Fleet Simulator</h3>
              <p className="text-xs text-slate-400">
                Live mathematical stress-testing of hypothetical transit scenarios.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Scenario Selection Cards */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-300 block">Select Scenario to Simulate:</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setScenarioType('demand_spike');
                  setParamNumber(25);
                }}
                className={`p-3 rounded-xl text-left border text-xs transition-all ${
                  scenarioType === 'demand_spike'
                    ? 'bg-cyan-950/70 border-cyan-500 text-white shadow-md shadow-cyan-900/20'
                    : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-bold text-cyan-400 mb-1">+25 Demand Spike</div>
                <div className="text-[11px] text-slate-400">Model Town & Bypass surge registrations</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setScenarioType('bus_unavailable');
                  setParamNumber(0);
                }}
                className={`p-3 rounded-xl text-left border text-xs transition-all ${
                  scenarioType === 'bus_unavailable'
                    ? 'bg-rose-950/60 border-rose-500 text-white shadow-md shadow-rose-900/20'
                    : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-bold text-rose-400 mb-1">Bus Breakdown</div>
                <div className="text-[11px] text-slate-400">Vehicle stops mid-transit, requires swap</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setScenarioType('absenteeism');
                  setParamNumber(30);
                }}
                className={`p-3 rounded-xl text-left border text-xs transition-all ${
                  scenarioType === 'absenteeism'
                    ? 'bg-blue-950/60 border-blue-500 text-white shadow-md shadow-blue-900/20'
                    : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-bold text-blue-400 mb-1">30% Absenteeism</div>
                <div className="text-[11px] text-slate-400">Weather delay / post-exam low attendance</div>
              </button>
            </div>
          </div>

          {/* Interactive Parameter Slider */}
          {scenarioType !== 'bus_unavailable' && (
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">
                  {scenarioType === 'demand_spike' ? 'Simulate Additional Student Load' : 'Simulate Student Absence Percentage'}
                </span>
                <span className="font-mono font-bold text-cyan-400">
                  {paramNumber} {scenarioType === 'demand_spike' ? 'Students' : '%'}
                </span>
              </div>
              <input
                type="range"
                min={scenarioType === 'demand_spike' ? 5 : 10}
                max={scenarioType === 'demand_spike' ? 45 : 60}
                value={paramNumber}
                onChange={(e) => setParamNumber(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-400"
              />
            </div>
          )}

          {/* Live Before vs After Calculation Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                Simulation Impact Analysis
              </h4>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  result.status === 'Critical Capacity Exceeded'
                    ? 'bg-rose-950 text-rose-300 border border-rose-800'
                    : result.status === 'Overload Warning'
                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                }`}
              >
                {result.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Before Box */}
              <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3">
                <span className="text-[10px] uppercase font-mono text-slate-500 font-semibold block">
                  Current State (Before)
                </span>
                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Corridor:</span>
                    <span className="font-medium text-white">{result.before.route}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Passengers:</span>
                    <span className="font-mono">{result.before.students} / {result.before.capacity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Utilization:</span>
                    <span className="font-mono font-bold text-slate-200">{result.before.utilizationPercent}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Est. Travel Time:</span>
                    <span className="font-mono text-slate-300">{result.before.avgTravelMin} mins</span>
                  </div>
                </div>
              </div>

              {/* After Box */}
              <div className="bg-slate-950/70 p-4 rounded-xl border border-cyan-800/40 space-y-3 relative overflow-hidden">
                <span className="text-[10px] uppercase font-mono text-cyan-400 font-semibold block">
                  Simulated State (After)
                </span>
                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Corridor:</span>
                    <span className="font-medium text-white">{result.after.route}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Passengers:</span>
                    <span className="font-mono font-bold text-white">
                      {result.after.students} / {result.after.capacity}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Utilization:</span>
                    <span className={`font-mono font-black ${
                      result.after.utilizationPercent > 100 ? 'text-rose-400' : 'text-cyan-400'
                    }`}>
                      {result.after.utilizationPercent}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Est. Travel Time:</span>
                    <span className="font-mono text-slate-200">{result.after.avgTravelMin} mins</span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Recommendation Summary */}
            <div className="bg-cyan-950/30 border border-cyan-800/50 p-4 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold">
                <Sparkles className="w-4 h-4" />
                <span>ViaAI Recommended Action:</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {result.recommendation}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/60">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors">
            Close Simulation
          </button>
          <button
            id="btn-apply-whatif-action"
            onClick={() => {
              if (onApplyAction) onApplyAction(result);
              onClose();
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow"
          >
            <Zap className="w-4 h-4" />
            <span>{result.actionOption}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
