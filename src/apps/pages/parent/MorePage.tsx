import React from 'react';
import {
  Student,
  TransportRoute,
  Driver,
  TransportHistoryItem,
  PaymentInstallment,
} from '../../../types';
import { Card, Button, ProgressIndicator } from '../../../components/ui';
import {
  Phone,
  ShieldCheck,
  History,
  CreditCard,
  Receipt,
  MapPin,
  Bus,
  CheckCircle2,
  Clock,
} from 'lucide-react';

interface ParentMorePageProps {
  child: Student;
  route: TransportRoute;
  driver: Driver;
  history: TransportHistoryItem[];
  installments: PaymentInstallment[];
  onOpenPaymentModal: () => void;
}

const SEMESTER_TOTAL = 55000;

/** Guardian account: emergency contacts, journey history and semester fees. */
export const ParentMorePage: React.FC<ParentMorePageProps> = ({
  child,
  route,
  driver,
  history,
  installments,
  onOpenPaymentModal,
}) => {
  const paid = installments.filter((i) => i.status === 'Paid').reduce((s, i) => s + i.amount, 0);
  const remaining = Math.max(0, SEMESTER_TOTAL - paid);
  const progress = Math.round((paid / SEMESTER_TOTAL) * 100);
  const nextDue = installments.find((i) => i.status !== 'Paid');

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-4">
      <header>
        <h1 className="text-base font-bold text-white">More</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Contacts, journey history and fees for {child.name.split(' ')[0]}.
        </p>
      </header>

      {/* Emergency contacts */}
      <Card padding="sm">
        <h2 className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5 mb-3">
          <ShieldCheck className="w-3.5 h-3.5 text-ok-400" aria-hidden="true" />
          Emergency Contacts
        </h2>
        <div className="space-y-2">
          <ContactRow
            name={child.parentName || 'Guardian'}
            detail="Registered guardian"
            phone={child.parentPhone}
          />
          <ContactRow
            name={`Captain ${driver.name}`}
            detail={`${route.name.split(':')[0]} • ★ ${driver.rating}`}
            phone={driver.cell}
          />
        </div>
        <p className="mt-3 text-[11px] text-slate-500 leading-relaxed">
          In an emergency, call the captain first. The transport dispatch center is monitoring every
          vehicle live.
        </p>
      </Card>

      {/* Journey history */}
      <Card padding="sm">
        <h2 className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5 mb-3">
          <History className="w-3.5 h-3.5" aria-hidden="true" />
          Journey History
        </h2>
        {history.length === 0 ? (
          <p className="text-xs text-slate-400 py-2">No journeys recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {history.slice(0, 4).map((item) => {
              const inTransit = item.status === 'Picked Up';
              return (
                <li
                  key={item.id}
                  className="rounded-lg bg-surface-2/50 border border-line px-3 py-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-white truncate">{item.date}</span>
                    <span
                      className={[
                        'shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold border',
                        inTransit
                          ? 'bg-warn-500/10 text-warn-300 border-warn-500/40'
                          : 'bg-ok-500/10 text-ok-300 border-ok-500/40',
                      ].join(' ')}
                    >
                      {inTransit ? (
                        <Clock className="w-3 h-3" aria-hidden="true" />
                      ) : (
                        <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                      )}
                      {item.status}
                    </span>
                  </div>
                  <div className="mt-1.5 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 min-w-0">
                      <MapPin className="w-3 h-3 shrink-0 text-brand-400" aria-hidden="true" />
                      <span className="truncate">{item.pickupStop}</span>
                      <span className="font-mono shrink-0">{item.boardingTime}</span>
                    </span>
                    <span className="flex items-center gap-1 min-w-0">
                      <Bus className="w-3 h-3 shrink-0 text-slate-500" aria-hidden="true" />
                      <span className="truncate">{item.dropStop}</span>
                      <span className="font-mono shrink-0">{item.dropTime}</span>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* Fees */}
      <Card padding="sm">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <h2 className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Semester Transport Fee
            </h2>
            <p className="text-xl font-bold font-mono text-white mt-0.5">
              Rs. {SEMESTER_TOTAL.toLocaleString()}
            </p>
          </div>
          <span
            className={[
              'shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold border',
              remaining === 0
                ? 'bg-ok-500/10 text-ok-300 border-ok-500/40'
                : 'bg-warn-500/10 text-warn-300 border-warn-500/40',
            ].join(' ')}
          >
            {remaining === 0 ? 'CLEARED' : `${progress}% PAID`}
          </span>
        </div>
        <ProgressIndicator
          value={progress}
          tone={remaining === 0 ? 'ok' : 'brand'}
          size="sm"
        />
        <p className="mt-2 text-[11px] text-slate-400">
          {remaining === 0
            ? 'Fee fully paid for this semester.'
            : `Rs. ${remaining.toLocaleString()} remaining${nextDue ? ` • next due ${nextDue.dueDate}` : ''}.`}
        </p>
        <Button
          variant={remaining === 0 ? 'secondary' : 'primary'}
          size="md"
          full
          className="mt-3"
          icon={
            remaining === 0 ? (
              <Receipt className="w-4 h-4" />
            ) : (
              <CreditCard className="w-4 h-4" />
            )
          }
          onClick={onOpenPaymentModal}
        >
          {remaining === 0
            ? 'View Challan & Receipt'
            : `Pay Next Installment (Rs. ${(nextDue?.amount ?? remaining).toLocaleString()})`}
        </Button>
      </Card>
    </div>
  );
};

const ContactRow: React.FC<{ name: string; detail: string; phone?: string }> = ({
  name,
  detail,
  phone,
}) => (
  <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-2/50 border border-line px-3 py-2.5">
    <div className="min-w-0">
      <p className="text-xs font-bold text-white truncate">{name}</p>
      <p className="text-[11px] text-slate-400 truncate">{detail}</p>
    </div>
    {phone ? (
      <a
        href={`tel:${phone}`}
        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-ok-500 text-slate-950 font-bold text-xs hover:bg-ok-400 transition-colors touch-target"
      >
        <Phone className="w-3.5 h-3.5" aria-hidden="true" />
        Call
      </a>
    ) : (
      <span className="shrink-0 text-[11px] text-slate-500">No number</span>
    )}
  </div>
);
