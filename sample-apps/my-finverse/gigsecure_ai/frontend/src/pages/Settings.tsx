import React from 'react';
import { SlidersHorizontal, ShieldCheck, Database, KeyRound, Cpu } from 'lucide-react';

export const Settings: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-3">
          <SlidersHorizontal className="w-7 h-7 text-emerald-400" /> Platform Configuration & System Settings
        </h1>
        <p className="text-xs text-slate-400 mt-1">Configure ML model thresholds, API connections, and security protocols</p>
      </div>

      <div className="glass-card p-6 rounded-3xl border border-slate-800 space-y-6">
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <Cpu className="w-4 h-4 text-emerald-400" /> Machine Learning Engine Configuration
          </h2>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-1">
              <div className="text-slate-400">Active Model Pipeline</div>
              <div className="font-mono font-bold text-emerald-400">XGBoost Regressor v1.4</div>
              <div className="text-[10px] text-slate-500">Trained on 5,200 Gig Samples</div>
            </div>
            <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-1">
              <div className="text-slate-400">Min Credit Score Cutoff</div>
              <div className="font-mono font-bold text-white">550 / 850</div>
              <div className="text-[10px] text-slate-500">Auto-Approval Ceiling: 740+</div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Security & Fraud Protocols
          </h2>
          <div className="space-y-2 text-xs">
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between">
              <span>SHA-256 Multi-Bank Hashing Algorithm</span>
              <span className="font-mono font-bold text-emerald-400">ENABLED (SHA-256)</span>
            </div>
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between">
              <span>Government GST Verification API Mock</span>
              <span className="font-mono font-bold text-emerald-400">CONNECTED</span>
            </div>
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between">
              <span>Account Aggregator Sandbox Protocol</span>
              <span className="font-mono font-bold text-emerald-400">ACTIVE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
