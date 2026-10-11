import React from 'react';
import { Check, FlaskConical, Sparkles, X } from 'lucide-react';
import type { AIRecommendation, TransportRoute } from '../../../types';
import { Button, Card, EmptyState, ProgressIndicator, SectionHeader } from '../../../components/ui';
import { AdminPageHeader } from './AdminPageHeader';

interface ViaAIPageProps {
  recommendations: AIRecommendation[];
  routes: TransportRoute[];
  onAcceptRecommendation: (rec: AIRecommendation) => void;
  onRejectRecommendation: (rec: AIRecommendation) => void;
  onRunOptimization: () => void;
  onOpenWhatIf: () => void;
}

const typeLabel: Record<AIRecommendation['type'], { label: string; badge: string }> = {
  redistribution: { label: 'LOAD REDISTRIBUTION', badge: 'bg-violet-950 text-violet-300 border border-violet-800' },
  extra_bus: { label: 'EXTRA BUS RECOMMENDED', badge: 'bg-cyan-950 text-cyan-300 border border-cyan-800' },
  breakdown_replace: { label: 'EMERGENCY VEHICLE SWAP', badge: 'bg-rose-950 text-rose-300 border border-rose-800' },
  route_optimize: { label: 'ROUTE OPTIMIZATION', badge: 'bg-blue-950 text-blue-300 border border-blue-800' },
  delay_mitigation: { label: 'DELAY MITIGATION', badge: 'bg-amber-950 text-amber-300 border border-amber-800' },
  staff_assign: { label: 'STAFF ASSIGNMENT', badge: 'bg-emerald-950 text-emerald-300 border border-emerald-800' },
};

interface ConditionRow {
  label: string;
  value: string;
}

interface ConditionImpact {
  label: string;
  route1Name?: string;
  route1Students?: number;
  route1Util?: number;
  route2Name?: string;
  route2Students?: number;
  route2Util?: number;
  travelTimeMin?: number;
  unusedCapacity?: number;
  affectedStudents?: number;
}

const renderCondition = (impact: ConditionImpact): ConditionRow[] => {
  const rows: ConditionRow[] = [];
  if (impact.route1Name !== undefined) {
    rows.push({
      label: impact.route1Name,
      value: `${impact.route1Students ?? '—'} riders · ${impact.route1Util ?? '—'}% util`,
    });
  }
  if (impact.route2Name !== undefined) {
    rows.push({
      label: impact.route2Name,
      value: `${impact.route2Students ?? '—'} riders · ${impact.route2Util ?? '—'}% util`,
    });
  }
  if (impact.travelTimeMin !== undefined) {
    rows.push({
      label: 'Avg travel time',
      value: impact.travelTimeMin >= 900 ? 'Halted' : `${impact.travelTimeMin} min`,
    });
  }
  if (impact.unusedCapacity !== undefined) {
    rows.push({ label: 'Free seats', value: String(impact.unusedCapacity) });
  }
  if (impact.affectedStudents !== undefined) {
    rows.push({ label: 'Riders served', value: String(impact.affectedStudents) });
  }
  return rows;
};

export const ViaAIPage: React.FC<ViaAIPageProps> = ({
  recommendations,
  routes,
  onAcceptRecommendation,
  onRejectRecommendation,
  onRunOptimization,
  onOpenWhatIf,
}) => {
  const pending = recommendations.filter((r) => r.status === 'pending');
  const decided = recommendations.filter((r) => r.status !== 'pending');

  const routeLabel = (routeId?: string) => {
    if (!routeId) return null;
    const route = routes.find((r) => r.id === routeId);
    return route ? `R${route.routeNumber} · ${route.name.split(':')[0]}` : null;
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="ViaAI Workspace"
        subtitle="Decision support over live fleet telemetry — recommendations are produced by deterministic heuristic analysis."
        actions={
          <>
            <Button variant="secondary" size="sm" icon={<FlaskConical className="w-4 h-4" />} onClick={onOpenWhatIf}>
              What-If Simulator
            </Button>
            <Button variant="primary" size="sm" icon={<Sparkles className="w-4 h-4" />} onClick={onRunOptimization}>
              Run Optimization Analysis
            </Button>
          </>
        }
      />

      <div className="rounded-xl border border-line bg-surface/60 px-4 py-3 text-xs text-slate-400 leading-relaxed">
        <span className="font-bold text-slate-300">How to read these cards:</span> figures marked as projected or
        estimated are computed from current corridor load, delay, and fleet data using rule-based analysis. Confidence
        scores express how strongly the rules support the recommendation — they are not machine-learning predictions.
      </div>

      {pending.length === 0 ? (
        <EmptyState
          title="No open recommendations"
          message="Run an optimization analysis or wait for live telemetry to surface a suggestion — accepted and rejected items are archived in the decision log below."
          icon={<Sparkles className="w-6 h-6" />}
          action={
            <Button variant="secondary" size="sm" icon={<Sparkles className="w-4 h-4" />} onClick={onRunOptimization}>
              Run Optimization Analysis
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {pending.map((rec) => {
            const meta = typeLabel[rec.type];
            const affected = routeLabel(rec.targetRouteId);
            const before = renderCondition(rec.impactBefore);
            const after = renderCondition(rec.impactAfter);
            const confTone = rec.confidence >= 90 ? 'ok' : rec.confidence >= 75 ? 'brand' : 'warn';

            return (
              <Card key={rec.id} padding="md" className="flex flex-col gap-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider font-mono ${meta.badge}`}
                    >
                      {meta.label}
                    </span>
                    <h3 className="text-sm font-bold text-white mt-2 leading-snug">{rec.title}</h3>
                    <p className="text-xs text-slate-400 mt-1">{rec.what}</p>
                  </div>
                  {affected && (
                    <span className="shrink-0 text-[11px] font-mono text-slate-400 border border-line rounded-lg px-2.5 py-1">
                      {affected}
                    </span>
                  )}
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-line bg-surface-2/40 p-3">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 font-mono mb-2">
                      {rec.impactBefore.label}
                    </p>
                    <ul className="space-y-1.5">
                      {before.map((row) => (
                        <li key={row.label} className="flex items-center justify-between gap-2 text-xs">
                          <span className="text-slate-400 truncate">{row.label}</span>
                          <span className="font-mono font-bold text-slate-200 shrink-0">{row.value}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-xl border border-ok-500/25 bg-ok-500/5 p-3">
                    <p className="text-[10px] uppercase tracking-widest text-ok-400/80 font-mono mb-2">
                      {rec.impactAfter.label}
                    </p>
                    <ul className="space-y-1.5">
                      {after.map((row) => (
                        <li key={row.label} className="flex items-center justify-between gap-2 text-xs">
                          <span className="text-slate-400 truncate">{row.label}</span>
                          <span className="font-mono font-bold text-ok-300 shrink-0">{row.value}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 md:items-center">
                  <ProgressIndicator
                    value={rec.confidence}
                    tone={confTone}
                    label="Confidence score"
                    showValue
                    size="sm"
                  />
                  <p className="text-xs text-slate-400 md:text-right">
                    <span className="text-slate-500">Estimated impact: </span>
                    {rec.impactAfter.affectedStudents !== undefined
                      ? `${rec.impactAfter.affectedStudents} riders relieved`
                      : 'fleet load rebalanced'}
                    {rec.impactBefore.travelTimeMin !== undefined &&
                      rec.impactAfter.travelTimeMin !== undefined &&
                      rec.impactBefore.travelTimeMin < 900 &&
                      ` · travel ${rec.impactBefore.travelTimeMin} → ${rec.impactAfter.travelTimeMin} min`}
                  </p>
                </div>

                <div className="border-t border-line pt-3">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 font-mono mb-2">
                    Why this was recommended
                  </p>
                  <ul className="space-y-1.5">
                    {rec.why.map((reason, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-300 leading-relaxed">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-400 shrink-0" aria-hidden="true" />
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    variant="danger"
                    size="sm"
                    icon={<X className="w-4 h-4" />}
                    onClick={() => onRejectRecommendation(rec)}
                  >
                    Reject
                  </Button>
                  <Button
                    variant="success"
                    size="sm"
                    icon={<Check className="w-4 h-4" />}
                    onClick={() => onAcceptRecommendation(rec)}
                  >
                    Accept Recommendation
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {decided.length > 0 && (
        <Card padding="md">
          <SectionHeader
            title="Decision Log"
            subtitle="Accepted and rejected recommendations from this session."
            icon={<Check className="w-4 h-4" />}
          />
          <ul className="mt-3 divide-y divide-line">
            {decided.map((rec) => (
              <li key={rec.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-200 truncate">{rec.title}</span>
                  <span className="block text-[11px] text-slate-500 font-mono">
                    {typeLabel[rec.type].label} · confidence {rec.confidence}%
                  </span>
                </span>
                <span
                  className={`shrink-0 px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                    rec.status === 'accepted'
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : 'bg-slate-800 text-slate-400 border-slate-600'
                  }`}
                >
                  {rec.status === 'accepted' ? 'Accepted' : 'Rejected'}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
};
