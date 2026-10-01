import React, { useState } from 'react';
import { Driver, Vehicle, TransportRoute } from '../../../types';
import { AlertTriangle, Send, CheckCircle2, Radio } from 'lucide-react';

interface IncidentsPageProps {
  driver: Driver;
  vehicle: Vehicle;
  route: TransportRoute;
  onReportIncident: (type: string, message: string) => void;
}

const INCIDENT_TYPES = [
  'Traffic Bottleneck',
  'Mechanical Trouble',
  'Road Blocked / Route Diversion',
  'Severe Weather',
];

/**
 * Incident broadcast. Previously a modal launched from the trip screen; now its
 * own destination so the captain can file a report without losing trip context.
 */
export const IncidentsPage: React.FC<IncidentsPageProps> = ({
  driver,
  vehicle,
  route,
  onReportIncident,
}) => {
  const [issueType, setIssueType] = useState(INCIDENT_TYPES[0]);
  const [issueDetails, setIssueDetails] = useState(
    'Heavy bumper-to-bumper queue near Northern Bypass intersection.'
  );
  const [submitted, setSubmitted] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onReportIncident(issueType, issueDetails);
    setSubmitted(issueType);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <header>
        <h1 className="text-base font-bold text-white">Report an Incident</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Your report alerts the Mobility Command Center and recalculates ETA for affected students.
        </p>
      </header>

      <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs">
        <Radio className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
        <span className="text-slate-300">
          Broadcasting as <strong className="text-white">{driver.name}</strong> •{' '}
          <span className="font-mono">{vehicle.vehicleNumber}</span> • {route.name.split(':')[0]}
        </span>
      </div>

      {submitted && (
        <div
          role="status"
          className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-950/50 border border-emerald-800/60 text-xs text-emerald-200"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            <strong className="text-emerald-300">{submitted}</strong> transmitted to the Command Center.
            Guardians on this corridor have been notified and delays are reflected in live ETAs.
          </span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 text-xs"
      >
        <div>
          <label htmlFor="incident-type" className="block text-slate-300 font-semibold mb-1.5">
            Incident Category
          </label>
          <select
            id="incident-type"
            value={issueType}
            onChange={(e) => setIssueType(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-rose-500"
          >
            <option value="Traffic Bottleneck">Traffic Bottleneck / Congestion (+10m)</option>
            <option value="Mechanical Trouble">Mechanical Trouble / Emergency Halt</option>
            <option value="Road Blocked / Route Diversion">Road Blocked / Route Diversion</option>
            <option value="Severe Weather">Severe Fog / Weather Slowness</option>
          </select>
        </div>

        <div>
          <label htmlFor="incident-details" className="block text-slate-300 font-semibold mb-1.5">
            Details &amp; Location
          </label>
          <textarea
            id="incident-details"
            value={issueDetails}
            onChange={(e) => setIssueDetails(e.target.value)}
            rows={4}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-rose-500"
          />
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => {
              setSubmitted(null);
              setIssueDetails('');
            }}
            className="px-4 py-2.5 text-slate-400 hover:text-white font-semibold"
          >
            Clear
          </button>
          <button
            type="submit"
            className="flex-1 flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all shadow"
          >
            <Send className="w-4 h-4" aria-hidden="true" />
            <span>Transmit Incident Alert</span>
          </button>
        </div>
      </form>

      <p className="flex items-start gap-1.5 text-[11px] text-slate-500">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
        Mechanical emergencies also trigger a ViaAI replacement-dispatch recommendation for the admin.
      </p>
    </div>
  );
};
