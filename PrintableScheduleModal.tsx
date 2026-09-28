import React from 'react';
import { TransportRoute, Driver, Vehicle } from '../types';
import { X, Printer, Download, Bus, CheckCircle2, ShieldCheck } from 'lucide-react';

interface PrintableScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  routes: TransportRoute[];
  drivers: Driver[];
  vehicles: Vehicle[];
}

export const PrintableScheduleModal: React.FC<PrintableScheduleModalProps> = ({
  isOpen,
  onClose,
  routes,
  drivers,
  vehicles,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-6xl bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-8">
        {/* Modal Header (Hidden on Print) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white no-print">
          <div className="flex items-center gap-2">
            <Bus className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold">ViaFast • Official Transport Schedule & Timetable</h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              id="btn-print-schedule-action"
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors shadow"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Official Printable Document Container */}
        <div id="printable-schedule-document" className="p-8 max-w-full overflow-x-auto bg-white font-sans text-slate-900">
          {/* Official Document Banner */}
          <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
            <div className="flex items-center justify-center gap-3 mb-1">
              <span className="text-2xl font-black tracking-tight text-slate-950 uppercase">
                FAST-NUCES Multan Campus
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-700 tracking-wide uppercase">
              University Transport Service • Official Route Timings & Schedule
            </h2>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Academic Year 2026 • Powered by ViaFast Transit Intelligence • Valid for All Morning & Return Trips
            </p>
          </div>

          {/* Schedule Table (Side by Side Routes matching the PDF) */}
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border-collapse border border-slate-400">
              <thead>
                <tr className="bg-slate-100 text-slate-900 font-bold">
                  {routes.map((route) => {
                    const vehicle = vehicles.find((v) => v.id === route.busId);
                    return (
                      <th
                        key={route.id}
                        colSpan={3}
                        className="border border-slate-400 px-2 py-2 text-center bg-slate-200"
                      >
                        <div className="font-extrabold text-xs text-blue-900 uppercase">
                          Route #{route.routeNumber}
                        </div>
                        <div className="text-[10px] text-slate-600 font-normal">
                          {route?.name ? (route.name.split(':')[1]?.trim() || route.name) : `Route ${route.routeNumber}`}
                        </div>
                      </th>
                    );
                  })}
                </tr>
                <tr className="bg-slate-50 text-slate-800 font-semibold text-[10px]">
                  {routes.map((route) => (
                    <React.Fragment key={`sub-${route.id}`}>
                      <th className="border border-slate-300 px-1.5 py-1 text-center w-8">Sr #</th>
                      <th className="border border-slate-300 px-2 py-1 text-left">Stop Name</th>
                      <th className="border border-slate-300 px-1.5 py-1 text-center w-16">Time</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Max number of stops across all routes */}
                {Array.from({ length: 17 }).map((_, rowIdx) => (
                  <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                    {routes.map((route) => {
                      const stop = route.stops[rowIdx];
                      if (!stop) {
                        return (
                          <React.Fragment key={`empty-${route.id}-${rowIdx}`}>
                            <td className="border border-slate-300 px-1.5 py-1 text-center text-slate-300">-</td>
                            <td className="border border-slate-300 px-2 py-1 text-slate-300">-</td>
                            <td className="border border-slate-300 px-1.5 py-1 text-center text-slate-300">-</td>
                          </React.Fragment>
                        );
                      }
                      const isCampus = stop.name.toLowerCase().includes('campus');
                      return (
                        <React.Fragment key={`cell-${route.id}-${stop.id}`}>
                          <td className="border border-slate-300 px-1.5 py-1 text-center font-mono text-slate-600">
                            {stop.sequence}
                          </td>
                          <td className={`border border-slate-300 px-2 py-1 ${isCampus ? 'font-bold text-blue-800' : 'text-slate-800'}`}>
                            {stop.name}
                          </td>
                          <td className={`border border-slate-300 px-1.5 py-1 text-center font-mono font-semibold ${isCampus ? 'text-blue-900 bg-blue-50' : 'text-slate-700'}`}>
                            {stop.morningTime}
                          </td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
              {/* Footer with Vehicles, Drivers and Contact Numbers */}
              <tfoot>
                <tr className="bg-slate-100 font-bold">
                  {routes.map((route) => {
                    const vehicle = vehicles.find((v) => v.id === route.busId);
                    const driver = drivers.find((d) => d.id === route.driverId);
                    return (
                      <td
                        key={`foot-${route.id}`}
                        colSpan={3}
                        className="border border-slate-400 p-2.5 text-center align-top bg-slate-100"
                      >
                        <div className="font-extrabold text-xs text-slate-900">
                          {vehicle?.vehicleNumber || 'Coaster # --'}
                        </div>
                        <div className="text-[11px] text-slate-800 font-semibold mt-0.5">
                          Driver: {driver?.name || 'Assigned Driver'}
                        </div>
                        <div className="text-[10px] font-mono text-blue-700 font-bold mt-0.5">
                          Cell # {driver?.cell || '0300-0000000'}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Instructions and Transport Office Notes */}
          <div className="mt-6 pt-4 border-t border-slate-300 text-[11px] text-slate-600 flex flex-col md:flex-row justify-between gap-4">
            <div>
              <p className="font-bold text-slate-800 mb-1">Student & Passenger Guidelines:</p>
              <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                <li>Please arrive at your designated stop 5 minutes before scheduled departure time.</li>
                <li>Digital QR ID verification required upon boarding each morning and return trip.</li>
                <li>Return journeys depart sharp at 3:30 PM from the University Main Gate Terminal.</li>
              </ul>
            </div>
            <div className="text-right">
              <p className="font-bold text-slate-800">Transport Directorate</p>
              <p>Email: transport@fast.edu.pk</p>
              <p>Helpline: (061) 111-128-128</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
