import React from 'react';
import { Coins, Clock, CheckCircle2 } from 'lucide-react';
import { Loan } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

export const LoanCard: React.FC<{ loan: Loan }> = ({ loan }) => {
  return (
    <div className="glass-card p-6 rounded-3xl border border-slate-800 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 font-bold">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-extrabold text-white">Loan #LN-{loan.id}</div>
            <div className="text-[11px] text-slate-400">Sanctioned: {formatDate(loan.created_at)}</div>
          </div>
        </div>

        <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${
          loan.status === 'Active'
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            : loan.status === 'Completed'
            ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
            : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
        }`}>
          {loan.status.toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-xs">
        <div>
          <div className="text-slate-400">Principal</div>
          <div className="font-bold text-white mt-0.5">{formatCurrency(loan.principal_amount)}</div>
        </div>
        <div>
          <div className="text-slate-400">Daily AutoPay</div>
          <div className="font-bold text-emerald-400 mt-0.5">{formatCurrency(loan.daily_repayment_amount)}</div>
        </div>
        <div>
          <div className="text-slate-400">Balance</div>
          <div className="font-bold text-white mt-0.5">{formatCurrency(loan.remaining_balance)}</div>
        </div>
      </div>
    </div>
  );
};
