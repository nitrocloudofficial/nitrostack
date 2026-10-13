import React from 'react';
import { FileCheck2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

interface InvoiceCardProps {
  invoiceNumber: string;
  gstin: string;
  amount: number;
  date: string;
  sha256Hash: string;
  isDuplicate?: boolean;
}

export const InvoiceCard: React.FC<InvoiceCardProps> = ({
  invoiceNumber,
  gstin,
  amount,
  date,
  sha256Hash,
  isDuplicate = false,
}) => {
  return (
    <div className={`glass-card p-5 rounded-2xl border ${isDuplicate ? 'border-rose-500/40 bg-rose-500/5' : 'border-slate-800'} space-y-3`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileCheck2 className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-bold text-white">Invoice #{invoiceNumber}</span>
        </div>
        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
          isDuplicate
            ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
            : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
        }`}>
          {isDuplicate ? 'DUPLICATE' : 'VERIFIED'}
        </span>
      </div>

      <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 break-all">
        <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">SHA-256 Fingerprint</div>
        <span className="text-emerald-400">{sha256Hash}</span>
      </div>

      <div className="flex items-center justify-between text-xs pt-1">
        <span className="text-slate-400">GSTIN: <code className="text-white">{gstin}</code></span>
        <span className="font-extrabold text-white text-sm">{formatCurrency(amount)}</span>
      </div>
    </div>
  );
};
