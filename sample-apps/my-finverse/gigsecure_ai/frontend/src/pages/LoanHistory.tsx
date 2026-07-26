import React, { useEffect, useState } from 'react';
import { History, Coins, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { Loan } from '../types';

export const LoanHistory: React.FC = () => {
  const [loans, setLoans] = useState<Loan[]>([
    {
      id: 101,
      user_id: 1,
      principal_amount: 25000,
      total_repayable: 27500,
      interest_rate: 12.5,
      tenure_months: 6,
      daily_repayment_amount: 152.78,
      remaining_balance: 18400,
      status: 'Active',
      created_at: '2026-06-01T10:00:00Z'
    },
    {
      id: 98,
      user_id: 1,
      principal_amount: 10000,
      total_repayable: 10800,
      interest_rate: 11.5,
      tenure_months: 3,
      daily_repayment_amount: 120.00,
      remaining_balance: 0,
      status: 'Completed',
      created_at: '2026-02-15T09:30:00Z'
    }
  ]);

  useEffect(() => {
    api.get('/loan/history')
      .then(res => {
        if (res.data && res.data.length > 0) setLoans(res.data);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-3">
            <History className="w-7 h-7 text-emerald-400" /> Micro-Loan History & Active Ledger
          </h1>
          <p className="text-xs text-slate-400 mt-1">Track all active and past credit facilities</p>
        </div>
      </div>

      <div className="space-y-4">
        {loans.map((loan) => (
          <div key={loan.id} className="glass-card p-6 rounded-3xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 font-bold">
                <Coins className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-extrabold text-white">Loan #LN-{loan.id}</span>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    loan.status === 'Active'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : loan.status === 'Completed'
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                      : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                  }`}>
                    {loan.status.toUpperCase()}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Sanctioned Date: {new Date(loan.created_at).toLocaleDateString()} • Tenure: {loan.tenure_months} Months
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 border-t md:border-t-0 pt-3 md:pt-0 border-slate-800">
              <div className="text-right">
                <div className="text-xs text-slate-400">Principal</div>
                <div className="text-sm font-bold text-white">₹{loan.principal_amount.toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400">Daily AutoPay</div>
                <div className="text-sm font-bold text-emerald-400">₹{loan.daily_repayment_amount}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400">Remaining Balance</div>
                <div className="text-sm font-bold text-white">₹{loan.remaining_balance.toLocaleString()}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
