import React, { useState } from 'react';
import { BadgeCheck, IdCard, Star, UserPlus, Users as UsersIcon } from 'lucide-react';
import type { Driver, Student, TransportRoute, Vehicle } from '../../../types';
import { Avatar, Button, Card, EmptyState, StatusBadge, Tabs } from '../../../components/ui';
import type { TabItem } from '../../../components/ui';
import { AdminPageHeader } from './AdminPageHeader';

type PeopleTab = 'students' | 'drivers' | 'staff';

interface PeoplePageProps {
  routes: TransportRoute[];
  vehicles: Vehicle[];
  drivers: Driver[];
  students: Student[];
  onOpenStaffModal: () => void;
}

const driverStatusStyle: Record<Driver['status'], string> = {
  'On Trip': 'bg-cyan-950 text-cyan-300 border border-cyan-800',
  Ready: 'bg-emerald-950 text-emerald-300 border border-emerald-800',
  Standby: 'bg-slate-800 text-slate-300 border border-slate-600',
  'Off Duty': 'bg-slate-900 text-slate-400 border border-slate-700',
};

export const PeoplePage: React.FC<PeoplePageProps> = ({
  routes,
  vehicles,
  drivers,
  students,
  onOpenStaffModal,
}) => {
  const [tab, setTab] = useState<PeopleTab>('students');

  const tabItems: TabItem<PeopleTab>[] = [
    { id: 'students', label: `Students (${students.filter((s) => !s.isStaff).length})`, domId: 'admin-people-tab-students' },
    { id: 'drivers', label: `Drivers (${drivers.length})`, domId: 'admin-people-tab-drivers' },
    { id: 'staff', label: `Staff Riders (${students.filter((s) => s.isStaff).length})`, domId: 'admin-people-tab-staff' },
  ];

  const routeLabel = (routeId: string) => {
    const route = routes.find((r) => r.id === routeId);
    return route ? `R${route.routeNumber} · ${route.name.split(':')[0]}` : '—';
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="People"
        subtitle={`${students.filter((s) => !s.isStaff).length} registered students · ${drivers.length} captains · ${students.filter((s) => s.isStaff).length} staff riders`}
        actions={
          <Button variant="primary" size="sm" icon={<UserPlus className="w-4 h-4" />} onClick={onOpenStaffModal}>
            Issue Staff Ride Pass
          </Button>
        }
      />

      <Tabs items={tabItems} value={tab} onChange={setTab} ariaLabel="People sections" />

      {tab === 'students' && (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-line">
                  <th className="px-4 py-2 font-semibold">Student</th>
                  <th className="px-4 py-2 font-semibold">Department</th>
                  <th className="px-4 py-2 font-semibold">Corridor</th>
                  <th className="px-4 py-2 font-semibold">Pickup Stop</th>
                  <th className="px-4 py-2 font-semibold">Journey</th>
                  <th className="px-4 py-2 font-semibold">Fees</th>
                </tr>
              </thead>
              <tbody>
                {students
                  .filter((s) => !s.isStaff)
                  .map((student) => {
                    const route = routes.find((r) => r.id === student.routeId);
                    const stop = route?.stops.find((st) => st.id === student.pickupStopId);
                    return (
                      <tr key={student.id} className="border-b border-line/50 hover:bg-surface-2/60 transition-colors">
                        <td className="px-4 py-2.5">
                          <span className="flex items-center gap-2.5">
                            <Avatar src={student.avatar} name={student.name} size="sm" />
                            <span className="min-w-0">
                              <span className="block font-semibold text-slate-100 truncate">{student.name}</span>
                              <span className="block font-mono text-[11px] text-slate-500">
                                {student.studentId}
                              </span>
                            </span>
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-slate-300">
                          {student.department}
                          <span className="block text-[11px] text-slate-500">Semester {student.semester}</span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-slate-300">{routeLabel(student.routeId)}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-300">{stop?.name ?? '—'}</td>
                        <td className="px-4 py-2.5">
                          <StatusBadge kind="journey" status={student.journeyStatus} />
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                              student.feeStatus === 'Paid'
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                : 'bg-amber-950 text-amber-300 border-amber-800'
                            }`}
                          >
                            <BadgeCheck className="w-3 h-3" aria-hidden="true" />
                            {student.feeStatus ?? 'Pending'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'drivers' && (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-line">
                  <th className="px-4 py-2 font-semibold">Captain</th>
                  <th className="px-4 py-2 font-semibold">Contact</th>
                  <th className="px-4 py-2 font-semibold">License</th>
                  <th className="px-4 py-2 font-semibold">Vehicle / Corridor</th>
                  <th className="px-4 py-2 font-semibold">Rating</th>
                  <th className="px-4 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((driver) => {
                  const vehicle = vehicles.find((v) => v.id === driver.assignedVehicleId);
                  return (
                    <tr key={driver.id} className="border-b border-line/50 hover:bg-surface-2/60 transition-colors">
                      <td className="px-4 py-2.5">
                        <span className="flex items-center gap-2.5">
                          <Avatar src={driver.avatar} name={driver.name} size="sm" />
                          <span className="min-w-0">
                            <span className="block font-semibold text-slate-100 truncate">{driver.name}</span>
                            <span className="block text-[11px] text-slate-500">
                              {driver.experienceYears ?? '—'} yrs experience
                            </span>
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs font-mono text-slate-300">{driver.cell}</td>
                      <td className="px-4 py-2.5 text-xs font-mono text-slate-400">{driver.licenseNumber}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-300">
                        <span className="block font-mono text-slate-200">{vehicle?.vehicleNumber ?? '—'}</span>
                        <span className="block text-[11px] text-slate-500">{routeLabel(driver.assignedRouteId)}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-300">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                          {driver.rating.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${driverStatusStyle[driver.status]}`}
                        >
                          {driver.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'staff' && (
        <Card padding="md">
          {students.filter((s) => s.isStaff).length === 0 ? (
            <EmptyState
              title="No staff ride passes issued"
              message="Faculty and staff can request single-trip corridor passes when they need campus transport."
              icon={<UsersIcon className="w-6 h-6" />}
              action={
                <Button variant="secondary" size="sm" icon={<UserPlus className="w-4 h-4" />} onClick={onOpenStaffModal}>
                  Issue Staff Ride Pass
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-line">
              {students
                .filter((s) => s.isStaff)
                .map((staff) => (
                  <li key={staff.id} className="flex items-center justify-between gap-3 py-3">
                    <span className="flex items-center gap-3 min-w-0">
                      <Avatar src={staff.avatar} name={staff.name} size="sm" />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-slate-100 truncate">{staff.name}</span>
                        <span className="block text-[11px] text-slate-500">
                          {staff.department} · single-trip pass
                        </span>
                      </span>
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="hidden sm:flex items-center gap-1 text-xs text-slate-400">
                        <IdCard className="w-3.5 h-3.5" aria-hidden="true" />
                        {routeLabel(staff.routeId)}
                      </span>
                      <StatusBadge kind="journey" status={staff.journeyStatus} />
                    </span>
                  </li>
                ))}
            </ul>
          )}
          {students.filter((s) => s.isStaff).length > 0 && (
            <div className="mt-4 pt-3 border-t border-line flex justify-end">
              <Button variant="secondary" size="sm" icon={<UserPlus className="w-4 h-4" />} onClick={onOpenStaffModal}>
                Issue Another Pass
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
