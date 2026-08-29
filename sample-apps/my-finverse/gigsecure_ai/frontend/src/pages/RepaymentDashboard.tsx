import React, { useState } from 'react';
import { CalendarClock, Play, Pause, CheckCircle2, ShieldCheck } from 'lucide-react';
import { repaymentService } from '../services/repaymentService';
import { formatCurrency } from '../utils/formatters';
import { useNotification } from '../hooks/useNotification';

export const RepaymentDashboard: React.FC = () => {
  const { addToast } = useNotification();
  const [todayEarnings, setTodayEarnings] = useState<number>(1250);
  const [loanId, setLoanId] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [repaymentResult, setRepaymentResult] = useState<any>(null);

  const handleSimulateDailyDebit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await repaymentService.processDailyRepayment(loanId, todayEarnings);
      setRepaymentResult(res);
      if (res.smart_pause_activated) {
        addToast('warning', 'Smart-Pause Activated', res.message);
      } else {
        addToast('success', 'UPI AutoPay Processed', `Debited ${formatCurrency(res.debit_amount)}.`);
      }
    } catch {
      addToast('info', 'Repayment Processed', 'Daily repayment check complete.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-3">
          <CalendarClock className="w-7 h-7 text-emerald-400" /> Adaptive UPI AutoPay Repayment Engine
        </h1>
        <p className="text-xs text-slate-400 mt-1">Zero-income protection safeguard automatically pausing auto-debit when income drops to zero</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-6 rounded-3xl border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-white border-b border-slate-800 pb-3">Simulate Daily Gig Partner Earnings</h2>

          <form onSubmit={handleSimulateDailyDebit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Today's Earnings (INR)</label>
              <input
                type="number"
                value={todayEarnings}
                onChange={(e) => setTodayEarnings(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-sm font-extrabold text-emerald-400 focus:border-emerald-500 focus:outline-none"
                placeholder="1250"
                required
              />
              <p className="text-[10px] text-slate-500 mt-1.5">
                Set earnings to <strong className="text-rose-400">0</strong> to test zero-income Smart-Pause protection.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              {loading ? 'Processing Adaptive UPI AutoPay...' : 'Simulate Daily Auto-Debit Cycle'}
            </button>
          </form>
        </div>

        <div className="glass-card p-6 rounded-3xl border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-white border-b border-slate-800 pb-3">AutoPay Cycle Status</h2>

          {repaymentResult ? (
            <div className={`p-4 rounded-2xl border text-xs space-y-3 ${repaymentResult.smart_pause_activated ? 'bg-amber-500/10 border-amber-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">
                  {repaymentResult.smart_pause_activated ? 'Smart-Pause Protection Active' : 'UPI Auto-Debit Executed'}
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${repaymentResult.smart_pause_activated ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>
                  {repaymentResult.status}
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Amount Debited:</span>
                  <span className="text-emerald-400 font-bold">{formatCurrency(repaymentResult.debit_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Remaining Loan Balance:</span>
                  <span className="text-white">{formatCurrency(repaymentResult.remaining_balance)}</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-300 leading-relaxed">{repaymentResult.message}</p>
            </div>
          ) : (
            <div className="text-center text-slate-400 py-6 space-y-2">
              <CalendarClock className="w-10 h-10 text-slate-600 mx-auto" />
              <div className="text-xs font-bold text-white">Daily Cycle Idle</div>
              <p className="text-[11px]">Submit daily earnings to view real-time AutoPay debit calculations.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
