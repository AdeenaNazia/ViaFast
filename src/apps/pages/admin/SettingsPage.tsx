import React from 'react';
import { Building2, Clock, Database, Info } from 'lucide-react';
import type { TransportRoute } from '../../../types';
import { Card, SectionHeader } from '../../../components/ui';
import { AdminPageHeader } from './AdminPageHeader';

interface SettingsPageProps {
  routes: TransportRoute[];
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ routes }) => {
  const serviceStart = routes.reduce(
    (earliest, r) => (r.morningStartTime < earliest ? r.morningStartTime : earliest),
    routes[0]?.morningStartTime ?? '—'
  );
  const serviceEnd = routes.reduce(
    (latest, r) => (r.campusArrivalTime > latest ? r.campusArrivalTime : latest),
    routes[0]?.campusArrivalTime ?? '—'
  );

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Settings"
        subtitle="Operating profile of this transport management deployment."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card padding="md">
          <SectionHeader
            title="Institution"
            subtitle="Read-only operating profile."
            icon={<Building2 className="w-4 h-4" />}
          />
          <dl className="mt-4 space-y-2.5 text-sm">
            {[
              ['Institution', 'FAST National University — Multan Campus'],
              ['Service', 'Campus Transport Management System'],
              ['Session', '2026 Academic Year'],
              ['City grid', 'Multan — 5 corridor zones'],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-3 border-b border-line/50 pb-2">
                <dt className="text-xs text-slate-500">{label}</dt>
                <dd className="text-xs font-semibold text-slate-200 text-right">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card padding="md">
          <SectionHeader
            title="Service Window"
            subtitle="Derived from the currently active corridor schedule."
            icon={<Clock className="w-4 h-4" />}
          />
          <dl className="mt-4 space-y-2.5 text-sm">
            <div className="flex items-center justify-between gap-3 border-b border-line/50 pb-2">
              <dt className="text-xs text-slate-500">First morning departure</dt>
              <dd className="font-mono text-xs font-bold text-slate-200">{serviceStart}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-line/50 pb-2">
              <dt className="text-xs text-slate-500">Last campus arrival</dt>
              <dd className="font-mono text-xs font-bold text-slate-200">{serviceEnd}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-line/50 pb-2">
              <dt className="text-xs text-slate-500">Active corridors</dt>
              <dd className="font-mono text-xs font-bold text-slate-200">{routes.length}</dd>
            </div>
          </dl>
        </Card>
      </div>

      <Card padding="md">
        <SectionHeader
          title="Data & Simulation"
          subtitle="How this deployment is fed and operated."
          icon={<Database className="w-4 h-4" />}
        />
        <ul className="mt-4 space-y-2.5 text-xs text-slate-300 leading-relaxed">
          <li className="flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" aria-hidden="true" />
            Official corridor schedules are imported from the transport office CSV on the Routes page.
          </li>
          <li className="flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" aria-hidden="true" />
            Live bus movement is simulated telemetry — pause, speed, and reset controls live on the Overview map.
          </li>
          <li className="flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" aria-hidden="true" />
            Fee schedules, notification rules, and user administration are managed by the transport office and are
            not configurable in this build.
          </li>
        </ul>
      </Card>
    </div>
  );
};
