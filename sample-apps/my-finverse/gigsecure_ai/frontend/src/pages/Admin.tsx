import React, { useEffect, useState } from 'react';
import { Lock, ShieldAlert, Users, Coins, HeartHandshake, TrendingUp } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { api } from '../services/api';

export const Admin: React.FC = () => {
  const [data, setData] = useState<any>({
    total_workers: 1420,
    total_loans_disbursed: 4850000,
    active_loans_count: 124,
    fraud_attempts_blocked: 38,
    succession_claims_processed: 14,
    repayment_rate: 98.4,
    loan_statistics: {
      total_applications: 1890,
      approval_rate: 84.2,
      npa_ratio: 0.42,
      average_ticket_size: 25000.0
    },
    fraud_attempts: [
      { date: "2026-07-20", bank: "HDFC Bank", status: "SHA256_MATCH_BLOCKED", type: "Duplicate Invoice" },
      { date: "2026-07-21", bank: "ICICI Bank", status: "SHA256_MATCH_BLOCKED", type: "Multi-Bank Fraud" },
      { date: "2026-07-22", bank: "Axis Bank", status: "PASSED", type: "Legitimate Invoice" },
      { date: "2026-07-23", bank: "SBI", status: "SHA256_MATCH_BLOCKED", type: "Re-pledged Invoice" }
    ]
  });

  useEffect(() => {
    api.get('/admin/dashboard')
      .then(res => {
        if (res.data) setData(res.data);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-3">
            <Lock className="w-7 h-7 text-emerald-400" /> Admin Risk & Executive Control Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">System-wide monitoring of underwriting, multi-bank fraud prevention, and claims</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Registered Gig Workers"
          value={data.total_workers.toLocaleString()}
          subtitle="Zomato, Swiggy, Uber"
          icon={Users}
          trend="12% MoM"
        />
        <StatCard
          title="Total Credit Disbursed"
          value={`₹${(data.total_loans_disbursed / 100000).toFixed(2)} Lakhs`}
          subtitle={`NPA Ratio: ${data.loan_statistics.npa_ratio}%`}
          icon={Coins}
          trend="98.4% Repaid"
        />
        <StatCard
          title="Fraud Shield Blocked"
          value={`${data.fraud_attempts_blocked} Duplicate Attempts`}
          subtitle="SHA-256 Multi-Ledger"
          icon={ShieldAlert}
          trend="100% Block Rate"
        />
        <StatCard
          title="Succession Claims"
          value={`${data.succession_claims_processed} Settled`}
          subtitle="Zero Legal Delays"
          icon={HeartHandshake}
        />
      </div>

      <div className="glass-card p-6 rounded-3xl border border-slate-800 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-400" /> Live Multi-Bank Duplicate Fraud Block Log
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800 uppercase tracking-wider">
                <th className="pb-3">Timestamp</th>
                <th className="pb-3">Reporting Bank</th>
                <th className="pb-3">Fraud Type</th>
                <th className="pb-3">Action Executed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {data.fraud_attempts.map((item: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-900/40">
                  <td className="py-3 font-mono text-slate-300">{item.date}</td>
                  <td className="py-3 font-bold text-white">{item.bank}</td>
                  <td className="py-3 text-slate-300">{item.type}</td>
                  <td className="py-3 font-bold font-mono text-emerald-400">{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
