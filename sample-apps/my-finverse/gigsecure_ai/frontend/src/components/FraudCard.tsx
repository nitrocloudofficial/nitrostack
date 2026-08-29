import React from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface FraudCardProps {
  date: string;
  bank: string;
  status: string;
  type: string;
}

export const FraudCard: React.FC<FraudCardProps> = ({ date, bank, status, type }) => {
  const isBlocked = status.includes('BLOCKED');

  return (
    <div className={`glass-card p-4 rounded-2xl border ${isBlocked ? 'border-rose-500/30 bg-rose-500/5' : 'border-slate-800'} flex items-center justify-between text-xs`}>
      <div className="flex items-center gap-3">
        <ShieldAlert className={`w-5 h-5 ${isBlocked ? 'text-rose-400' : 'text-emerald-400'}`} />
        <div>
          <div className="font-bold text-white">{bank} • {type}</div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{date}</div>
        </div>
      </div>

      <span className={`font-mono text-[10px] font-bold px-2.5 py-1 rounded-full border ${
        isBlocked
          ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
          : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      }`}>
        {status}
      </span>
    </div>
  );
};
