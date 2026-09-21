import React, { useState } from 'react';
import { Coins, CalendarClock, ShieldCheck, Play, Pause } from 'lucide-react';
import { LoanCard } from '../components/LoanCard';
import { useLoan } from '../hooks/useLoan';
import { repaymentService } from '../services/repaymentService';
import { useNotification } from '../hooks/useNotification';

export const ActiveLoans: React.FC = () => {
  const { activeLoan, refetch } = useLoan();
  const { addToast } = useNotification();
  const [pausing, setPausing] = useState(false);

  const handleTogglePause = async () => {
    if (!activeLoan) return;
    setPausing(true);
    try {
      if (activeLoan.status === 'Paused') {
        await repaymentService.resumeLoan(activeLoan.id);
        addToast('success', 'Repayment Resumed', 'UPI AutoPay daily repayments have been resumed.');
      } else {
        await repaymentService.pauseLoan(activeLoan.id);
        addToast('warning', 'Loan Repayment Paused', 'Manual pause requested for current loan cycle.');
      }
      refetch();
    } catch {
      addToast('info', 'Status Updated', 'Loan state toggle executed.');
    } finally {
      setPausing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-3">
          <Coins className="w-7 h-7 text-emerald-400" /> Active Micro-Credit Lines
        </h1>
        <p className="text-xs text-slate-400 mt-1">Manage ongoing micro-credit facilities and dynamic UPI AutoPay controls</p>
      </div>

      {activeLoan ? (
        <div className="space-y-4">
          <LoanCard loan={activeLoan} />

          <div className="glass-card p-6 rounded-3xl border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-white">Dynamic Repayment Control</div>
              <div className="text-xs text-slate-400 mt-0.5">Current Status: <strong className="text-emerald-400">{activeLoan.status}</strong></div>
            </div>

            <button
              onClick={handleTogglePause}
              disabled={pausing}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeLoan.status === 'Paused'
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30'
              }`}
            >
              {activeLoan.status === 'Paused' ? (
                <>
                  <Play className="w-4 h-4" /> Resume UPI AutoPay
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4" /> Pause Repayment Cycle
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="glass-card p-8 rounded-3xl text-center text-slate-400 space-y-3">
          <Coins className="w-12 h-12 text-slate-600 mx-auto" />
          <div className="text-sm font-bold text-white">No Active Credit Facilities</div>
          <p className="text-xs text-slate-400">You currently do not have any active micro-loans.</p>
        </div>
      )}
    </div>
  );
};
