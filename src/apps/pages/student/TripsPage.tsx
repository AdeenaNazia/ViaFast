import React, { useState } from 'react';
import { TransportHistoryItem } from '../../../types';
import { History, MapPin, Clock, Bus, CheckCircle2, AlertCircle } from 'lucide-react';

interface TripsPageProps {
  history: TransportHistoryItem[];
}

type Filter = 'all' | 'Morning' | 'Return';

/** Trip history. Backed by INITIAL_HISTORY, which was seeded but never wired up. */
export const TripsPage: React.FC<TripsPageProps> = ({ history }) => {
  const [filter, setFilter] = useState<Filter>('all');

  const visible = filter === 'all' ? history : history.filter((h) => h.tripType === filter);
  const completed = history.filter((h) => h.status === 'Completed').length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-white">Trip History</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {completed} of {history.length} recorded journeys completed on time.
          </p>
        </div>

        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          {(['all', 'Morning', 'Return'] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                filter === f ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {f === 'all' ? 'All Trips' : f}
            </button>
          ))}
        </div>
      </header>

      {visible.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-700 bg-surface/50 px-6 py-12 text-center">
          <History className="w-6 h-6 text-slate-500 mx-auto" aria-hidden="true" />
          <p className="text-sm font-bold text-slate-200 mt-3">No {filter.toLowerCase()} trips recorded</p>
          <p className="text-xs text-slate-400 mt-1">Journeys appear here once the bus marks you boarded.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((item) => {
            const inTransit = item.status === 'Picked Up';
            return (
              <li
                key={item.id}
                className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-white">{item.date}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${
                          item.tripType === 'Morning'
                            ? 'bg-cyan-950 text-cyan-300 border-cyan-800/60'
                            : 'bg-blue-950 text-blue-300 border-blue-800/60'
                        }`}
                      >
                        {item.tripType.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 truncate">{item.route}</p>
                  </div>

                  <span
                    className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                      inTransit
                        ? 'bg-amber-950/70 text-amber-300 border-amber-800/70'
                        : 'bg-emerald-950/70 text-emerald-300 border-emerald-800/70'
                    }`}
                  >
                    {inTransit ? (
                      <AlertCircle className="w-3 h-3" aria-hidden="true" />
                    ) : (
                      <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                    )}
                    {item.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800 text-[11px]">
                  <div className="flex items-start gap-1.5 min-w-0">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block text-slate-500 text-[9px] uppercase font-mono">Pickup</span>
                      <span className="block text-slate-200 truncate">{item.pickupStop}</span>
                      <span className="block text-slate-400 font-mono">{item.boardingTime}</span>
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5 min-w-0">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block text-slate-500 text-[9px] uppercase font-mono">Drop</span>
                      <span className="block text-slate-200 truncate">{item.dropStop}</span>
                      <span className="block text-slate-400 font-mono">{item.dropTime}</span>
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <Bus className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>
                      <span className="block text-slate-500 text-[9px] uppercase font-mono">Vehicle</span>
                      <span className="block text-slate-200">{item.bus}</span>
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>
                      <span className="block text-slate-500 text-[9px] uppercase font-mono">Delay</span>
                      <span
                        className={`block font-mono font-bold ${
                          item.delay === '0 min' ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {item.delay}
                      </span>
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
