import React from 'react';
import { ShieldCheck, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-800/80 bg-[#090d16]/80 py-6 px-6 text-center text-xs text-slate-400">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-semibold text-white">
          <ShieldCheck className="w-4 h-4 text-emerald-400" /> GigSecure AI Enterprise Platform © 2026
        </div>
        <div className="flex items-center gap-1">
          Empowering India's Informal Economy with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline" /> & Machine Learning
        </div>
        <div className="text-[11px] text-slate-400 font-mono">
          RBI Account Aggregator & Multi-Bank SHA-256 Ledger
        </div>
      </div>
    </footer>
  );
};
