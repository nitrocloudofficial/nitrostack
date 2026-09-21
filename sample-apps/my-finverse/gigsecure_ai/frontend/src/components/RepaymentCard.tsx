import React from 'react';
import { CalendarClock, Pause, CheckCircle2 } from 'lucide-react';
import { formatCurrency, formatDateTime } from '../utils/formatters';

interface RepaymentCardProps {
  amount: number;
  status: string;
  scheduledDate: string;
  smartPauseReason?: string;
  txnRef?: string;
}

export const RepaymentCard: React.FC<RepaymentCardProps> = ({
  amount,
  status,
  scheduledDate,
  smartPauseReason,
  txnRef,
}) => {
  const isSmartPaused = status === 'SmartPaused' || status === 'SMART_PAUSED';

  return (
    <div className={`glass-card p-5 rounded-2xl border ${isSmartPaused ? 'border-amber-500/30 bg-amber-500/5' : 'border-slate-800'} space-y-2`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isSmartPaused ? (
            <Pause className="w-5 h-5 text-amber-400" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          )}
          <span className="text-sm font-bold text-white">
            {isSmartPaused ? 'Smart-Pause Executed' : 'UPI AutoPay Paid'}
          </span>
        </div>
        <span className="text-sm font-extrabold text-emerald-400">{formatCurrency(amount)}</span>
      </div>

      {isSmartPaused && smartPauseReason && (
        <div className="text-xs text-amber-300 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
          {smartPauseReason}
        </div>
      )}

      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
        <span>Date: {formatDateTime(scheduledDate)}</span>
        {txnRef && <span className="font-mono text-emerald-400">Ref: {txnRef}</span>}
      </div>
    </div>
  );
};
