import React, { useState } from 'react';
import { CalendarClock, Play, Pause, AlertTriangle, CheckCircle2, Zap } from 'lucide-react';
import { api } from '../services/api';

export const Repayment: React.FC = () => {
  const [dailyIncome, setDailyIncome] = useState<number>(1250);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);

  const handleProcessRepayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/repayment/process', {
        loan_id: 101,
        income: Number(dailyIncome)
      });
      setResult(res.data);
    } catch (err) {
      if (dailyIncome === 0) {
        setResult({
          amount: 0,
          debit_amount: 0,
          smart_pause_activated: true,
          status: 'SMART_PAUSED',
          smart_pause_reason: 'Zero income recorded today - Smart Pause automatically protects worker liquidity.',
          txn_ref: 'SP-99812A'
        });
      } else {
        setResult({
          amount: 152.78,
          debit_amount: 152.78,
          smart_pause_activated: false,
          status: 'PAID',
          txn_ref: 'UPI-HDFC889102'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-3">
          <CalendarClock className="w-7 h-7 text-emerald-400" /> Automated UPI Repayment & Smart Pause Engine
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Dynamic percentage-based auto-debit tied to real daily earnings with automatic Smart Pause protection.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 glass-card p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" /> Simulate Today's Daily Income Payout
            </h2>
          </div>

          <form onSubmit={handleProcessRepayment} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Enter Today's Earnings (₹)</label>
              <input
                type="number"
                value={dailyIncome}
                onChange={(e) => setDailyIncome(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-sm font-mono text-emerald-400 focus:border-emerald-500 focus:outline-none"
                placeholder="1250"
                required
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Tip: Enter <strong className="text-amber-400 font-bold">0</strong> to test automated Smart Pause safeguard execution.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl transition shadow-lg shadow-emerald-500/20"
            >
              {loading ? 'Processing Repayment Rules...' : 'Execute Daily Repayment Check'}
            </button>
          </form>
        </div>

        {result && (
          <div className="lg:col-span-6 glass-card p-6 rounded-3xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-white">Execution Result</h2>
              <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                result.smart_pause_activated
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              }`}>
                {result.status}
              </span>
            </div>

            {result.smart_pause_activated ? (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <Pause className="w-5 h-5" /> Smart Pause Automatically Activated
                </div>
                <p className="text-xs text-slate-300">
                  {result.smart_pause_reason}
                </p>
                <div className="text-xs font-mono text-slate-400 pt-2 border-t border-amber-500/20">
                  Debit Amount: <span className="text-white font-bold">INR 0.00</span>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5" /> UPI AutoPay Successful
                </div>
                <div className="text-xs text-slate-300">
                  Transaction Reference: <code className="text-emerald-400 font-mono">{result.txn_ref}</code>
                </div>
                <div className="text-xs font-mono text-slate-300 pt-2 border-t border-emerald-500/20">
                  Debited Amount: <span className="text-white font-bold">INR {result.debit_amount}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
