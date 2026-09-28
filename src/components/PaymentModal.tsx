import React, { useState } from 'react';
import { Student, TransportRoute } from '../types';
import {
  CreditCard,
  Wallet,
  Building2,
  Smartphone,
  CheckCircle2,
  Download,
  Printer,
  X,
  ShieldCheck,
  Receipt,
  ArrowRight,
  Bus,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
  route: TransportRoute;
  onSuccessPayment: (studentId: string) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  student,
  route,
  onSuccessPayment,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | '1link' | 'mobile' | 'card'>('wallet');
  const [accountNumber, setAccountNumber] = useState('0300-7654321');
  const [cardHolder, setCardHolder] = useState('SARAH AHMED');
  const [cardNumber, setCardNumber] = useState('•••• •••• •••• 4920');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaid, setIsPaid] = useState((student.feeStatus || (student.feePaid && student.totalFee && student.feePaid >= student.totalFee ? 'Paid' : 'Pending')) === 'Paid');
  const [transactionRef, setTransactionRef] = useState(`TXN-FP-${Math.floor(100000 + Math.random() * 900000)}`);

  const feeDueAmount = student.feeAmount ?? (student.totalFee && student.feePaid ? Math.max(0, student.totalFee - student.feePaid) : 28000);

  if (!isOpen) return null;

  const handleProcessPayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsPaid(true);
      onSuccessPayment(student.id);
      confetti({ particleCount: 70, spread: 80 });
    }, 1200);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#020617]/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0f172a] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-[#020617]/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.4)] text-white">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">
                Official Transit Fee Payment & Challan
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Challan # FP-2026-8812 • FAST-NUCES Multan
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 max-h-[480px] overflow-y-auto">
          {/* Invoice Summary Card */}
          <div className="bg-[#020617]/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Student Payer</span>
                <h4 className="text-sm font-bold text-white">{student.name} ({student.rollNumber || student.studentId})</h4>
                <p className="text-xs text-slate-400">{student.department} • {route?.name ? route.name.split(':')[0] : 'FAST Transport'}</p>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Status</span>
                <div>
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      isPaid
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    }`}
                  >
                    {isPaid ? 'PAID & VERIFIED' : 'PAYMENT DUE'}
                  </span>
                </div>
              </div>
            </div>

            {/* Fee Itemization */}
            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Semester Transit Subscription:</span>
                <span className="font-mono text-white">Rs. 24,000</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Fuel & Corridor Capacity Indexing:</span>
                <span className="font-mono text-white">Rs. 3,500</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Campus Entry Pass RFID Sticker:</span>
                <span className="font-mono text-white">Rs. 500</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-800 text-sm font-bold text-white">
                <span>Total Amount Payable:</span>
                <span className="font-mono text-blue-400 text-base">Rs. {feeDueAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {!isPaid ? (
            /* Payment Gateway Options */
            <div className="space-y-4">
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
                Select Verified Payment Channel
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('wallet')}
                  className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                    paymentMethod === 'wallet'
                      ? 'bg-blue-600/20 border-blue-500 text-white shadow-[0_0_12px_rgba(37,99,235,0.3)]'
                      : 'bg-[#020617] border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Wallet className="w-5 h-5 text-blue-400" />
                  <span className="text-xs font-bold">FAST Wallet</span>
                  <span className="text-[9px] text-slate-500">1-Touch Pay</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('1link')}
                  className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                    paymentMethod === '1link'
                      ? 'bg-blue-600/20 border-blue-500 text-white shadow-[0_0_12px_rgba(37,99,235,0.3)]'
                      : 'bg-[#020617] border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Building2 className="w-5 h-5 text-cyan-400" />
                  <span className="text-xs font-bold">1Link / HBL</span>
                  <span className="text-[9px] text-slate-500">Kuickpay</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('mobile')}
                  className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                    paymentMethod === 'mobile'
                      ? 'bg-blue-600/20 border-blue-500 text-white shadow-[0_0_12px_rgba(37,99,235,0.3)]'
                      : 'bg-[#020617] border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Smartphone className="w-5 h-5 text-emerald-400" />
                  <span className="text-xs font-bold">Easypaisa</span>
                  <span className="text-[9px] text-slate-500">JazzCash OTP</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                    paymentMethod === 'card'
                      ? 'bg-blue-600/20 border-blue-500 text-white shadow-[0_0_12px_rgba(37,99,235,0.3)]'
                      : 'bg-[#020617] border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <CreditCard className="w-5 h-5 text-purple-400" />
                  <span className="text-xs font-bold">Visa / Debit</span>
                  <span className="text-[9px] text-slate-500">Mastercard</span>
                </button>
              </div>

              {/* Gateway Form Info */}
              <div className="p-4 bg-[#020617] border border-slate-800 rounded-xl space-y-3 text-xs">
                {paymentMethod === 'wallet' && (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 block">Available Student Wallet Balance:</span>
                      <span className="text-base font-bold text-emerald-400 font-mono">Rs. 32,500</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                      Sufficient Balance
                    </span>
                  </div>
                )}

                {paymentMethod === '1link' && (
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">
                      1Link 1Bill Invoice Consumer ID:
                    </label>
                    <input
                      type="text"
                      readOnly
                      value="100342-99281-2026"
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-lg p-2 font-mono text-cyan-300"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Payable via HBL Mobile, Meezan, Bank Alfalah or ATM
                    </span>
                  </div>
                )}

                {paymentMethod === 'mobile' && (
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">
                      Mobile Account Number (Easypaisa / JazzCash)
                    </label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-lg p-2 font-mono text-white"
                    />
                  </div>
                )}

                {paymentMethod === 'card' && (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Card Number</label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full bg-[#0f172a] border border-slate-700 rounded-lg p-2 font-mono text-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">Card Holder</label>
                        <input
                          type="text"
                          value={cardHolder}
                          onChange={(e) => setCardHolder(e.target.value)}
                          className="w-full bg-[#0f172a] border border-slate-700 rounded-lg p-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">Expiry / CVV</label>
                        <input
                          type="text"
                          defaultValue="08/28 • 812"
                          className="w-full bg-[#0f172a] border border-slate-700 rounded-lg p-2 font-mono text-white"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                id="btn-confirm-payment-now"
                onClick={handleProcessPayment}
                disabled={isProcessing}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <CreditCard className="w-4 h-4" />
                <span>
                  {isProcessing
                    ? 'Verifying Bank Transaction...'
                    : `Authorize & Pay Rs. ${feeDueAmount.toLocaleString()} Now`}
                </span>
              </button>
            </div>
          ) : (
            /* Paid Receipt Confirmation */
            <div className="p-5 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Transit Subscription Cleared!</h3>
              <p className="text-xs text-slate-300 max-w-md mx-auto">
                Payment verified by FAST-NUCES Accounts & Transport Dispatch. Your RFID digital pass is active on all assigned campus coasters.
              </p>
              <div className="inline-block p-2 rounded-xl bg-[#020617] border border-slate-800 text-xs font-mono text-emerald-400">
                Transaction ID: {transactionRef}
              </div>

              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handlePrintReceipt}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors shadow"
                >
                  <Printer className="w-4 h-4 text-blue-400" />
                  <span>Print Receipt Slip</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-[#020617]/80 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>Official University Accounts Voucher System</span>
          <span className="flex items-center gap-1 text-blue-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            SBP & 1Link Verified
          </span>
        </div>
      </div>
    </div>
  );
};
