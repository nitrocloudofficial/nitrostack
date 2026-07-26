import React from 'react';
import { Building2, CheckCircle2, Clock, FileText } from 'lucide-react';

export const Claims: React.FC = () => {
  const mockClaims = [
    {
      id: 'CLM-889102A',
      deceased: 'Rajesh Verma',
      nominee: 'Sunita Sharma (Wife)',
      amount: 329400,
      status: 'IN_REVIEW',
      date: '2026-07-20'
    },
    {
      id: 'CLM-772910B',
      deceased: 'Anand Shinde',
      nominee: 'Pooja Shinde (Sister)',
      amount: 195000,
      status: 'DISBURSED',
      date: '2026-06-14'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-3">
          <Building2 className="w-7 h-7 text-emerald-400" /> Succession Claim Status Tracker
        </h1>
        <p className="text-xs text-slate-400 mt-1">Real-time settlement status across bank accounts, insurance policies, and EPFO</p>
      </div>

      <div className="space-y-4">
        {mockClaims.map((claim) => (
          <div key={claim.id} className="glass-card p-6 rounded-3xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold text-white">Claim #{claim.id}</span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  claim.status === 'DISBURSED'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                }`}>
                  {claim.status}
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Deceased Worker: <span className="text-white font-semibold">{claim.deceased}</span> • Beneficiary: <span className="text-emerald-400">{claim.nominee}</span>
              </div>
            </div>

            <div className="flex items-center gap-6 border-t md:border-t-0 pt-3 md:pt-0 border-slate-800">
              <div className="text-right">
                <div className="text-xs text-slate-400">Total Claim Value</div>
                <div className="text-lg font-black text-white">₹{claim.amount.toLocaleString()}</div>
              </div>
              <a
                href="/api/reports/succession"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition border border-slate-700 flex items-center gap-2"
              >
                <FileText className="w-4 h-4 text-emerald-400" /> View Docket
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
