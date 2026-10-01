import React from 'react';
import { Student, PaymentInstallment, TransportRoute } from '../../../types';
import { CreditCard, CheckCircle2, Clock, AlertCircle, User, Bell, Receipt } from 'lucide-react';

interface MorePageProps {
  student: Student;
  route: TransportRoute;
  installments: PaymentInstallment[];
  unreadNotifications: number;
  onOpenPaymentModal: () => void;
  onOpenNotifications: () => void;
}

const SEMESTER_TOTAL = 55000;

/** Fees, installments and account. Installment totals are derived, not hardcoded. */
export const MorePage: React.FC<MorePageProps> = ({
  student,
  route,
  installments,
  unreadNotifications,
  onOpenPaymentModal,
  onOpenNotifications,
}) => {
  const paid = installments.filter((i) => i.status === 'Paid').reduce((sum, i) => sum + i.amount, 0);
  const remaining = Math.max(0, SEMESTER_TOTAL - paid);
  const nextDue = installments.find((i) => i.status !== 'Paid');
  const progress = Math.round((paid / SEMESTER_TOTAL) * 100);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <header>
        <h1 className="text-base font-bold text-white">Fees &amp; Account</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Semester transport fee, installment schedule and profile.
        </p>
      </header>

      {/* Fee summary */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
              Semester Transport Fee
            </span>
            <div className="text-2xl font-black text-white font-mono mt-1">
              Rs. {SEMESTER_TOTAL.toLocaleString()}
            </div>
          </div>
          <span
            className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-bold border ${
              remaining === 0
                ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/70'
                : 'bg-amber-950/70 text-amber-300 border-amber-800/70'
            }`}
          >
            {remaining === 0 ? 'CLEARED' : `${progress}% PAID`}
          </span>
        </div>

        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${remaining === 0 ? 'bg-emerald-500' : 'bg-cyan-500'}`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase font-mono">Paid to date</span>
            <span className="font-bold text-emerald-400 font-mono">Rs. {paid.toLocaleString()}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase font-mono">Remaining</span>
            <span className="font-bold text-amber-400 font-mono">Rs. {remaining.toLocaleString()}</span>
          </div>
        </div>

        {remaining > 0 ? (
          <button
            id="btn-student-more-pay"
            type="button"
            onClick={onOpenPaymentModal}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)]"
          >
            <CreditCard className="w-4 h-4" aria-hidden="true" />
            Pay Next Installment (Rs. {(nextDue?.amount ?? remaining).toLocaleString()})
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenPaymentModal}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-colors"
          >
            <Receipt className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            View Official Challan &amp; Receipt
          </button>
        )}
      </div>

      {/* Installment schedule */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
          Installment Schedule
        </h2>

        <ol className="space-y-2.5">
          {installments.map((inst) => {
            const isPaid = inst.status === 'Paid';
            const isOverdue = inst.status === 'Overdue';
            return (
              <li
                key={inst.number}
                className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border ${
                  isOverdue
                    ? 'bg-rose-950/40 border-rose-800/60'
                    : isPaid
                    ? 'bg-slate-950/50 border-slate-800'
                    : 'bg-slate-950/70 border-amber-800/40'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold border ${
                      isPaid
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        : isOverdue
                        ? 'bg-rose-950 text-rose-300 border-rose-800'
                        : 'bg-amber-950 text-amber-300 border-amber-800'
                    }`}
                  >
                    {inst.number}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold text-white truncate">{inst.title}</span>
                    <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                      Due {inst.dueDate}
                    </span>
                  </span>
                </div>

                <div className="text-right shrink-0">
                  <span className="block text-xs font-mono font-bold text-white">
                    Rs. {inst.amount.toLocaleString()}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-semibold mt-0.5 ${
                      isPaid ? 'text-emerald-400' : isOverdue ? 'text-rose-400' : 'text-amber-400'
                    }`}
                  >
                    {isPaid ? (
                      <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                    ) : isOverdue ? (
                      <AlertCircle className="w-3 h-3" aria-hidden="true" />
                    ) : (
                      <Clock className="w-3 h-3" aria-hidden="true" />
                    )}
                    {inst.status}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>

        {nextDue && (
          <p className="text-[11px] text-slate-400 flex items-start gap-1.5 pt-1">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
            Next payment of Rs. {nextDue.amount.toLocaleString()} is due {nextDue.dueDate}.
          </p>
        )}
      </div>

      {/* Profile & account */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3">
          <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" aria-hidden="true" />
            Profile
          </h2>
          <div className="flex items-center gap-3">
            <img
              src={student.avatar}
              alt={student.name}
              className="w-12 h-12 rounded-2xl object-cover border border-slate-700"
            />
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{student.name}</p>
              <p className="text-[11px] text-slate-400 font-mono">{student.rollNumber}</p>
            </div>
          </div>
          <dl className="space-y-1.5 text-xs pt-2 border-t border-slate-800">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Department</dt>
              <dd className="text-slate-200 truncate">{student.department}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Semester</dt>
              <dd className="text-slate-200">{student.semester}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Registration</dt>
              <dd className="text-slate-200">{student.registrationStatus}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Corridor</dt>
              <dd className="text-slate-200 truncate">{route.name.split(':')[0]}</dd>
            </div>
          </dl>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3">
          <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
            <Bell className="w-3.5 h-3.5" aria-hidden="true" />
            Notifications
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {unreadNotifications > 0
              ? `You have ${unreadNotifications} unread transport notification${unreadNotifications === 1 ? '' : 's'}.`
              : 'You are all caught up on transport notifications.'}
          </p>
          <button
            type="button"
            onClick={onOpenNotifications}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-colors"
          >
            Open Notification Center
          </button>
        </div>
      </div>
    </div>
  );
};
