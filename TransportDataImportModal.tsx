import React, { useState } from 'react';
import {
  parseScheduleCSV,
  OFFICIAL_SCHEDULE_CSV_TEMPLATE,
  ImportRow,
} from '../utils/dataImport';
import { TransportRoute, Vehicle, Driver } from '../types';
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  X,
  Plus,
  MapPin,
} from 'lucide-react';

interface TransportDataImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (importedRoutes: TransportRoute[]) => void;
}

export const TransportDataImportModal: React.FC<TransportDataImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const [rawText, setRawText] = useState(OFFICIAL_SCHEDULE_CSV_TEMPLATE);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [previewActive, setPreviewActive] = useState(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleParse = () => {
    const result = parseScheduleCSV(rawText);
    const combined = [...result.validRows, ...result.invalidRows];
    setRows(combined);
    setPreviewActive(true);
    setImportNotice(`Validated ${combined.length} stop entries across ${result.routesDetected.length} routes.`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRawText(content);
      const result = parseScheduleCSV(content);
      setRows([...result.validRows, ...result.invalidRows]);
      setPreviewActive(true);
      setImportNotice(`Loaded file "${file.name}" with ${result.totalRows} records.`);
    };
    reader.readAsText(file);
  };

  const handleUpdateRow = (id: string, field: keyof ImportRow, value: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: value };
        // recheck basic validity
        const errs: string[] = [];
        if (!updated.stopName) errs.push('Stop name is required');
        if (!updated.morningTiming) errs.push('Morning timing is required');
        updated.hasErrors = errs.length > 0;
        updated.errors = errs;
        return updated;
      })
    );
  };

  const handleConfirmImport = () => {
    const validRows = rows.filter((r) => !r.hasErrors);
    if (validRows.length === 0) {
      alert('No valid records to import. Please correct missing fields first.');
      return;
    }

    // Group rows by route
    const routeMap = new Map<string, ImportRow[]>();
    validRows.forEach((r) => {
      const key = r.routeNumber || '1';
      if (!routeMap.has(key)) routeMap.set(key, []);
      routeMap.get(key)!.push(r);
    });

    const colors = ['#06b6d4', '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899'];
    let cIdx = 0;

    const newRoutes: TransportRoute[] = [];

    routeMap.forEach((rRows, routeNumStr) => {
      const num = parseInt(routeNumStr, 10) || 1;
      const first = rRows[0];
      const rId = `route-${num}`;
      const color = colors[cIdx % colors.length];
      cIdx++;

      const stops = rRows.map((row, idx) => ({
        id: `${rId}-s${idx + 1}`,
        sequence: parseInt(row.stopSequence, 10) || idx + 1,
        name: row.stopName,
        morningTime: row.morningTiming,
        returnTime: row.returnTiming || '3:30 PM',
        lat: parseFloat(row.lat || '0') || 30.200 + idx * 0.005,
        lng: parseFloat(row.lng || '0') || 71.460 + idx * 0.004,
        demand: Math.max(1, 4 - (idx % 3)),
        distanceKm: parseFloat(row.distanceKm || '0') || idx * 1.5,
      }));

      newRoutes.push({
        id: rId,
        routeNumber: num,
        name: first.routeName || `Route ${num}`,
        direction: 'Inbound to Campus',
        busId: `veh-${num}`,
        driverId: `drv-${num}`,
        stops,
        totalDistanceKm: stops[stops.length - 1]?.distanceKm || 18,
        status: 'On Time',
        color,
        morningStartTime: stops[0]?.morningTime || '7:15 AM',
        campusArrivalTime: stops[stops.length - 1]?.morningTime || '8:25 AM',
      });
    });

    onImportSuccess(newRoutes);
    onClose();
  };

  const validCount = rows.filter((r) => !r.hasErrors).length;
  const invalidCount = rows.filter((r) => r.hasErrors).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-950/80 text-cyan-400 border border-cyan-800/50">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Transport Data Import & Schedule Manager
              </h3>
              <p className="text-xs text-slate-400">
                Upload CSV or Excel schedule sheets to dynamically update campus routes and stops.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-3">
              <label
                htmlFor="csv-upload-input"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold cursor-pointer transition-colors shadow"
              >
                <FileText className="w-4 h-4 text-cyan-400" />
                <span>Upload CSV / Excel File</span>
                <input
                  id="csv-upload-input"
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <button
                id="btn-load-official-template"
                onClick={() => {
                  setRawText(OFFICIAL_SCHEDULE_CSV_TEMPLATE);
                  setPreviewActive(false);
                  setImportNotice('Loaded official Multan campus 5-route timetable.');
                }}
                className="px-3 py-2 rounded-xl bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-800/50 text-xs font-medium transition-colors"
              >
                Reset to Official PDF Timetable
              </button>
            </div>

            <button
              id="btn-validate-parse-csv"
              onClick={handleParse}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Validate & Preview Records</span>
            </button>
          </div>

          {importNotice && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-950/60 border border-blue-800/60 text-blue-300 rounded-xl text-xs">
              <CheckCircle className="w-4 h-4 text-blue-400 shrink-0" />
              <span>{importNotice}</span>
            </div>
          )}

          {/* Raw Text / Editor when preview is not active */}
          {!previewActive ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300">
                  CSV Data Editor / Direct Paste:
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Comma-delimited with standard transport headers
                </span>
              </div>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={10}
                className="w-full bg-slate-950 font-mono text-xs text-slate-300 p-4 rounded-xl border border-slate-800 focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="Route #,Route Name,Stop Sequence,Stop Name,Morning Time,Return Time..."
              />
            </div>
          ) : (
            /* Preview Table with Missing/Invalid Value Highlighting */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-medium">
                    Valid: {validCount}
                  </span>
                  {invalidCount > 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-rose-950/80 text-rose-300 border border-rose-800/60 font-medium">
                      Requires Attention: {invalidCount}
                    </span>
                  )}
                  <span className="text-slate-400 text-[11px]">
                    Inline editing enabled. Missing coordinates use Demo Simulation coordinates.
                  </span>
                </div>

                <button
                  onClick={() => setPreviewActive(false)}
                  className="text-xs text-slate-400 hover:text-slate-200 underline"
                >
                  Edit Raw CSV
                </button>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-950 text-slate-400 font-semibold sticky top-0 border-b border-slate-800">
                    <tr>
                      <th className="p-2.5">R#</th>
                      <th className="p-2.5">Route Name</th>
                      <th className="p-2.5">Seq</th>
                      <th className="p-2.5">Stop Name</th>
                      <th className="p-2.5">Morning Time</th>
                      <th className="p-2.5">Vehicle</th>
                      <th className="p-2.5">Driver</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {rows.slice(0, 30).map((row) => (
                      <tr
                        key={row.id}
                        className={
                          row.hasErrors
                            ? 'bg-rose-950/30 text-rose-200'
                            : 'hover:bg-slate-800/40'
                        }
                      >
                        <td className="p-2 font-mono">{row.routeNumber}</td>
                        <td className="p-2 max-w-[140px] truncate">{row.routeName}</td>
                        <td className="p-2 font-mono">{row.stopSequence}</td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.stopName}
                            onChange={(e) => handleUpdateRow(row.id, 'stopName', e.target.value)}
                            className={`w-full bg-slate-950/80 px-2 py-1 rounded border text-xs ${
                              !row.stopName ? 'border-rose-500' : 'border-slate-800'
                            }`}
                          />
                        </td>
                        <td className="p-2 font-mono">
                          <input
                            type="text"
                            value={row.morningTiming}
                            onChange={(e) => handleUpdateRow(row.id, 'morningTiming', e.target.value)}
                            className={`w-20 bg-slate-950/80 px-2 py-1 rounded border text-xs ${
                              !row.morningTiming ? 'border-rose-500' : 'border-slate-800'
                            }`}
                          />
                        </td>
                        <td className="p-2">{row.vehicleNumber}</td>
                        <td className="p-2">{row.driverName}</td>
                        <td className="p-2">
                          {row.hasErrors ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-rose-400 font-medium">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>{row.errors?.[0]}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Ready</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > 30 && (
                <p className="text-[11px] text-slate-500 italic">
                  Showing first 30 of {rows.length} rows. All valid rows will be imported.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/60">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            id="btn-confirm-import-schedule"
            onClick={handleConfirmImport}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-xs transition-all shadow-lg shadow-cyan-500/20"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Confirm Import & Update Live Fleet ({validCount} Records)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
