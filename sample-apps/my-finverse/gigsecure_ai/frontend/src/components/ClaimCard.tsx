import React from 'react';
import { HeartHandshake, FileText, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

interface ClaimCardProps {
  claimId: string;
  deceasedName: string;
  nomineeName: string;
  amount: number;
  status: string;
}

export const ClaimCard: React.FC<ClaimCardProps> = ({ claimId, deceasedName, nomineeName, amount, status }) => {
  return (
    <div className="glass-card p-6 rounded-3xl border border-slate-800 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HeartHandshake className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-bold text-white">Claim #{claimId}</span>
        </div>
        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
          {status}
        </span>
      </div>

      <div className="text-xs text-slate-300">
        Deceased Worker: <strong className="text-white">{deceasedName}</strong> • Beneficiary: <strong className="text-emerald-400">{nomineeName}</strong>
      </div>

      <div className="flex items-center justify-between border-t border-slate-800 pt-3">
        <span className="text-xs text-slate-400">Total Asset Claim Value</span>
        <span className="text-base font-black text-white">{formatCurrency(amount)}</span>
      </div>
    </div>
  );
};
