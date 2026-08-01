'use client';

import React, { useEffect, useState } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import { executeGatewayTool } from '../../utils/gatewayClient';
import { Shield, ShieldAlert, CheckCircle2, Lock, Activity } from 'lucide-react';

interface StatsData {
  totalEntries: number;
  totalCalls: number;
  totalBlocked: number;
  totalAllowed: number;
  driftDetections: number;
  policyDenials: number;
  injectionFlags: number;
  chainValid: boolean;
}

export default function DashboardStatsWidget() {
  const { isReady, getToolOutput, callTool } = useWidgetSDK();
  const initialData = getToolOutput<StatsData>();
  const [stats, setStats] = useState<StatsData | null>(initialData || null);

  const fetchStats = async () => {
    try {
      const res = (await executeGatewayTool('get_dashboard_stats', {}, callTool, isReady)) as StatsData;
      if (res) {
        setStats(res);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (initialData) {
      setStats(initialData);
    }
  }, [initialData]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-sky-400" />
          <h2 className="text-lg font-bold text-slate-100">Sentinel Gateway — Security Operations Command</h2>
        </div>
        <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-500/30 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          ZERO-TRUST ACTIVE
        </span>
      </div>

      {/* Grid Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Card 1: Total Processed Calls */}
        <div className="glass-panel p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Agent Calls</span>
            <Activity className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">
            {stats?.totalCalls ?? 0}
          </div>
          <div className="text-[11px] text-slate-400">Proxied through Gateway</div>
        </div>

        {/* Card 2: Threats Blocked */}
        <div className="glass-panel p-4 space-y-1 border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Threats Blocked</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400">
            {stats?.totalBlocked ?? 0}
          </div>
          <div className="text-[11px] text-slate-400">Poisoning + RBAC + Injection</div>
        </div>

        {/* Card 3: Allowed Calls */}
        <div className="glass-panel p-4 space-y-1 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Allowed Calls</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {stats?.totalAllowed ?? 0}
          </div>
          <div className="text-[11px] text-slate-400">Passed all security checks</div>
        </div>

        {/* Card 4: Chain Verification */}
        <div className="glass-panel p-4 space-y-1 border-l-4 border-l-sky-500">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Ledger Integrity</span>
            <Lock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl font-bold font-mono text-sky-300">
            {stats?.chainValid ? 'VERIFIED ✓' : 'TAMPERED ⚠️'}
          </div>
          <div className="text-[11px] text-slate-400">{stats?.totalEntries ?? 0} Hashed Entries</div>
        </div>
      </div>

      {/* Breakdown bar */}
      <div className="glass-panel p-4 space-y-2">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Interception Metrics Breakdown</h3>
        <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
          <div className="p-2.5 bg-slate-900/80 rounded border border-slate-800">
            <span className="text-slate-400 block text-[10px]">TOOL POISONING DRIFT</span>
            <span className="text-base font-bold text-rose-400">{stats?.driftDetections ?? 0}</span>
          </div>
          <div className="p-2.5 bg-slate-900/80 rounded border border-slate-800">
            <span className="text-slate-400 block text-[10px]">RBAC DENIALS</span>
            <span className="text-base font-bold text-amber-400">{stats?.policyDenials ?? 0}</span>
          </div>
          <div className="p-2.5 bg-slate-900/80 rounded border border-slate-800">
            <span className="text-slate-400 block text-[10px]">INJECTION FLAGGED</span>
            <span className="text-base font-bold text-sky-400">{stats?.injectionFlags ?? 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
