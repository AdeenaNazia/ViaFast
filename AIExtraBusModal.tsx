import React, { useState } from 'react';
import { Vehicle, Driver, AIRecommendation } from '../types';
import { generateExtraBusProposal } from '../utils/aiEngines';
import {
  Bus,
  Sparkles,
  CheckCircle,
  X,
  MapPin,
  Clock,
  Users,
  Gauge,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface AIExtraBusModalProps {
  isOpen: boolean;
  onClose: () => void;
  reserveVehicle: Vehicle;
  reserveDriver: Driver;
  onAcceptExtraBus: (recommendation: AIRecommendation) => void;
}

export const AIExtraBusModal: React.FC<AIExtraBusModalProps> = ({
  isOpen,
  onClose,
  reserveVehicle,
  reserveDriver,
  onAcceptExtraBus,
}) => {
  const [reason, setReason] = useState('Extended Evening Lab Examinations Surge');
  const [journey, setJourney] = useState<'morning' | 'return'>('return');
  const [expectedDemand, setExpectedDemand] = useState(28);
  const [corridor, setCorridor] = useState('Northern Bypass & Wapda Town Link');
  const [proposedRoute, setProposedRoute] = useState<AIRecommendation | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const rec = generateExtraBusProposal(
        reason,
        journey,
        expectedDemand,
        corridor,
        reserveVehicle,
        reserveDriver
      );
      setProposedRoute(rec);
      setIsGenerating(false);
    }, 600);
  };

  const handleAccept = () => {
    if (!proposedRoute) return;
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
    onAcceptExtraBus(proposedRoute);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800/60">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">AI Extra Bus Planner</h3>
              <p className="text-xs text-slate-400">
                Automated demand analysis & surge route dispatch engine.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Inputs Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/50 p-4 rounded-xl border border-slate-800/80 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">Surge Trigger / Reason</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="Extended Evening Lab Examinations Surge">Extended Evening Lab Examinations Surge</option>
                <option value="Route 2 Peak Overload Spillover">Route 2 Peak Overload Spillover</option>
                <option value="University Symposium / Campus Event">University Symposium / Campus Event</option>
                <option value="Weather / Traffic Diversion Mitigation">Weather / Traffic Diversion Mitigation</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">Journey Direction</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setJourney('morning')}
                  className={`flex-1 py-2 rounded-lg font-semibold transition-all ${
                    journey === 'morning'
                      ? 'bg-cyan-600 text-white'
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}
                >
                  Morning Trip
                </button>
                <button
                  type="button"
                  onClick={() => setJourney('return')}
                  className={`flex-1 py-2 rounded-lg font-semibold transition-all ${
                    journey === 'return'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}
                >
                  Return Trip (3:30 PM)
                </button>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">
                Expected Additional Passengers: <span className="text-cyan-400 font-mono">{expectedDemand}</span>
              </label>
              <input
                type="range"
                min="10"
                max="40"
                value={expectedDemand}
                onChange={(e) => setExpectedDemand(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-400"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">Target Demand Corridor</label>
              <input
                type="text"
                value={corridor}
                onChange={(e) => setCorridor(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="md:col-span-2 flex items-center justify-between pt-2 border-t border-slate-800/80">
              <div className="flex items-center gap-2 text-slate-400">
                <Bus className="w-4 h-4 text-emerald-400" />
                <span>Reserve Fleet Assigned: <strong className="text-white">{reserveVehicle.vehicleNumber}</strong> ({reserveDriver.name})</span>
              </div>
              <button
                id="btn-trigger-generate-extra-bus"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold transition-all shadow-md shadow-cyan-500/20 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isGenerating ? 'Synthesizing Optimal Route...' : 'Generate Route with AI'}</span>
              </button>
            </div>
          </div>

          {/* AI Output Card */}
          {proposedRoute && proposedRoute.extraBusConfig && (
            <div className="bg-slate-950 border border-cyan-500/30 rounded-xl p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-cyan-400 font-bold">
                    AI PROPOSED SURGE DISPATCH
                  </span>
                  <h4 className="text-sm font-bold text-white mt-0.5">{proposedRoute.title}</h4>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase">Confidence</span>
                  <span className="text-sm font-black font-mono text-emerald-400">{proposedRoute.confidence}%</span>
                </div>
              </div>

              {/* Stop Sequence Flow */}
              <div>
                <span className="text-xs font-semibold text-slate-300 block mb-2">Automated Stop Sequence:</span>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {proposedRoute.extraBusConfig.stops.map((stop, idx, arr) => (
                    <React.Fragment key={stop}>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 font-medium">
                        {stop}
                      </span>
                      {idx < arr.length - 1 && (
                        <ArrowRight className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Metric Highlights */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-center">
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block">Est. Duration</span>
                  <span className="text-sm font-bold text-cyan-300 font-mono">
                    {proposedRoute.extraBusConfig.durationMin} mins
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block">Assigned Load</span>
                  <span className="text-sm font-bold text-white font-mono">
                    {proposedRoute.extraBusConfig.expectedPassengers} / {reserveVehicle.capacity}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block">Capacity Util</span>
                  <span className="text-sm font-bold text-emerald-400 font-mono">
                    {proposedRoute.extraBusConfig.utilization}%
                  </span>
                </div>
              </div>

              {/* Why bullet points */}
              <div className="space-y-1.5 text-xs text-slate-300 border-t border-slate-800 pt-3">
                <span className="font-semibold text-white block">AI Optimization Rationale:</span>
                {proposedRoute.why.map((reasonText, idx) => (
                  <p key={idx} className="flex items-start gap-2 text-slate-400">
                    <span className="text-cyan-400 font-bold">•</span>
                    <span>{reasonText}</span>
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/60">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors">
            Reject / Cancel
          </button>
          {proposedRoute && (
            <button
              id="btn-accept-extra-bus-plan"
              onClick={handleAccept}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs transition-all shadow-lg shadow-emerald-500/20"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Accept AI Route & Dispatch Vehicle</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
