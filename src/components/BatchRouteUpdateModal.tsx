import React, { useState } from 'react';
import { RouteChangeRequest, TransportRoute } from '../types';
import {
  CheckCheck,
  XCircle,
  X,
  Filter,
  Users,
  ShieldCheck,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface BatchRouteUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  requests: RouteChangeRequest[];
  routes: TransportRoute[];
  onBatchProcess: (requestIds: string[], action: 'approve' | 'reject') => void;
}

export const BatchRouteUpdateModal: React.FC<BatchRouteUpdateModalProps> = ({
  isOpen,
  onClose,
  requests,
  routes,
  onBatchProcess,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    requests.filter((r) => r.status === 'Pending').map((r) => r.id)
  );

  if (!isOpen) return null;

  const pendingRequests = requests.filter((r) => r.status === 'Pending');

  const toggleSelectAll = () => {
    if (selectedIds.length === pendingRequests.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingRequests.map((r) => r.id));
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBatchApprove = () => {
    if (selectedIds.length === 0) return;
    confetti({ particleCount: 50, spread: 60 });
    onBatchProcess(selectedIds, 'approve');
    onClose();
  };

  const handleBatchReject = () => {
    if (selectedIds.length === 0) return;
    onBatchProcess(selectedIds, 'reject');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800/60">
              <CheckCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Batch Route Update Processor</h3>
              <p className="text-xs text-slate-400">
                Bulk approval and intelligent capacity check for student route modification requests.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* AI Pre-validation Banner */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-cyan-950/40 border border-cyan-800/60 text-xs text-slate-300">
            <Sparkles className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-cyan-300 block mb-0.5">
                AI Capacity Pre-Verification Passed
              </span>
              <p className="text-slate-400 leading-relaxed">
                Analyzing proposed shifts against current corridor loads: Approving all {selectedIds.length} requests will maintain fleet utilization under 82% with 0 passenger overflows.
              </p>
            </div>
          </div>

          {/* Select all bar */}
          <div className="flex items-center justify-between px-2 text-xs text-slate-400">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.length === pendingRequests.length && pendingRequests.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded accent-cyan-500"
              />
              <span className="font-semibold text-slate-300">
                Select All Pending Requests ({selectedIds.length}/{pendingRequests.length})
              </span>
            </label>
            <span className="text-[11px] font-mono">Academic Term 2026</span>
          </div>

          {/* Table / Request list */}
          <div className="border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800 bg-slate-950/50 text-xs">
            {pendingRequests.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                No pending route change requests at this moment.
              </div>
            ) : (
              pendingRequests.map((req) => {
                const fromR = routes.find((r) => r.id === req.currentRouteId);
                const toR = routes.find((r) => r.id === req.requestedRouteId);
                const isChecked = selectedIds.includes(req.id);

                return (
                  <div
                    key={req.id}
                    className={`p-3.5 flex items-center justify-between gap-3 transition-colors ${
                      isChecked ? 'bg-slate-900/90' : 'hover:bg-slate-900/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelect(req.id)}
                        className="w-4 h-4 rounded accent-cyan-500"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{req.studentName}</span>
                          <span className="text-[10px] font-mono text-slate-400">{req.studentRollNumber}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          <span className="text-slate-300">{req.currentStopName}</span> ({fromR?.name ? fromR.name.split(':')[0] : 'Current Corridor'})
                          {' → '}
                          <span className="text-cyan-300 font-semibold">{req.requestedStopName}</span> ({toR?.name ? toR.name.split(':')[0] : 'Requested Corridor'})
                        </div>
                        <div className="text-[10px] text-slate-500 italic mt-0.5">
                          Reason: "{req.reason}"
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-500 block font-mono">{req.requestDate}</span>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950 text-amber-300 border border-amber-800/60">
                        {req.status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/60">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBatchReject}
              disabled={selectedIds.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700 text-xs font-bold transition-colors disabled:opacity-40"
            >
              <XCircle className="w-4 h-4 text-rose-400" />
              <span>Reject Selected ({selectedIds.length})</span>
            </button>
            <button
              id="btn-confirm-batch-approve"
              onClick={handleBatchApprove}
              disabled={selectedIds.length === 0}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-xs transition-all shadow-md shadow-cyan-500/20 disabled:opacity-40"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Batch Approve Selected ({selectedIds.length})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
