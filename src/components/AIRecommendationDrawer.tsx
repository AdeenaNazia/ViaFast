import React from 'react';
import { AIRecommendation } from '../types';
import {
  Sparkles,
  CheckCircle2,
  X,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Clock,
  Users,
  ShieldCheck,
} from 'lucide-react';

interface AIRecommendationDrawerProps {
  recommendation: AIRecommendation | null;
  onClose: () => void;
  onAccept: (rec: AIRecommendation) => void;
  onReject: (rec: AIRecommendation) => void;
}

export const AIRecommendationDrawer: React.FC<AIRecommendationDrawerProps> = ({
  recommendation,
  onClose,
  onAccept,
  onReject,
}) => {
  if (!recommendation) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/70 backdrop-blur-sm">
      <div className="relative w-full max-w-xl h-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800/60">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                ViaAI Autonomous Recommendation
              </span>
              <h3 className="text-sm font-bold text-white leading-tight mt-0.5">
                {recommendation.title}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* Confidence Badge */}
          <div className="flex items-center justify-between p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Algorithmic Optimization Confidence</span>
            </div>
            <span className="font-mono font-black text-sm text-emerald-400">
              {recommendation.confidence}%
            </span>
          </div>

          {/* What: Proposed Action */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
              Proposed Action (What)
            </h4>
            <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800/80 text-xs text-slate-200 leading-relaxed font-medium">
              {recommendation.what}
            </div>
          </div>

          {/* Why: Explainable Reasoning */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
              Optimization Rationale (Why)
            </h4>
            <div className="space-y-2 text-xs">
              {recommendation.why.map((reason, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/40 border border-slate-800 text-slate-300"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                  <span>{reason}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Impact Comparison (Before vs After) */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
              Projected Fleet Impact
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {/* Before */}
              <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 space-y-2 text-xs">
                <span className="text-[10px] font-mono text-slate-500 uppercase font-semibold block">
                  {recommendation.impactBefore.label}
                </span>
                {recommendation.impactBefore.route1Students !== undefined && (
                  <div className="space-y-1 text-slate-300 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400 truncate">{recommendation.impactBefore.route1Name}:</span>
                      <span className="font-mono text-rose-400 font-bold">{recommendation.impactBefore.route1Util}%</span>
                    </div>
                    {recommendation.impactBefore.route2Name && (
                      <div className="flex justify-between">
                        <span className="text-slate-400 truncate">{recommendation.impactBefore.route2Name}:</span>
                        <span className="font-mono">{recommendation.impactBefore.route2Util}%</span>
                      </div>
                    )}
                  </div>
                )}
                <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                  Est. Travel Time: <strong className="text-white">{recommendation.impactBefore.travelTimeMin}m</strong>
                </div>
              </div>

              {/* After */}
              <div className="p-3.5 bg-slate-950/70 rounded-xl border border-cyan-800/40 space-y-2 text-xs">
                <span className="text-[10px] font-mono text-cyan-400 uppercase font-semibold block">
                  {recommendation.impactAfter.label}
                </span>
                {recommendation.impactAfter.route1Students !== undefined && (
                  <div className="space-y-1 text-slate-300 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400 truncate">{recommendation.impactAfter.route1Name}:</span>
                      <span className="font-mono text-emerald-400 font-bold">{recommendation.impactAfter.route1Util}%</span>
                    </div>
                    {recommendation.impactAfter.route2Name && (
                      <div className="flex justify-between">
                        <span className="text-slate-400 truncate">{recommendation.impactAfter.route2Name}:</span>
                        <span className="font-mono">{recommendation.impactAfter.route2Util}%</span>
                      </div>
                    )}
                  </div>
                )}
                <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                  Est. Travel Time: <strong className="text-emerald-400">{recommendation.impactAfter.travelTimeMin}m</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 border-t border-slate-800 bg-slate-950/80">
          <button
            onClick={() => onReject(recommendation)}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Dismiss / Reject
          </button>
          <button
            id="btn-accept-ai-recommendation"
            onClick={() => onAccept(recommendation)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-emerald-500/20"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Accept & Execute Optimization</span>
          </button>
        </div>
      </div>
    </div>
  );
};
