'use client';

import React, { useState, useEffect } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import { executeGatewayTool } from '../utils/gatewayClient';
import DashboardStatsWidget from './dashboard-stats/page';
import AttackDemoWidget from './attack-demo/page';
import LiveFeedWidget from './live-feed/page';
import LedgerViewerWidget from './ledger-viewer/page';
import ReviewQueueWidget from './review-queue/page';
import ServerTopologyWidget from './server-topology/page';
import { Shield, Activity, Flame, Database, AlertOctagon, Network, BarChart3, Zap, CheckCircle2, Play } from 'lucide-react';

export default function UnifiedDashboardPage() {
  const { isReady, callTool } = useWidgetSDK();
  const [activeTab, setActiveTab] = useState<'overview' | 'attack' | 'feed' | 'ledger' | 'review' | 'topology'>('overview');
  const [isInitializing, setIsInitializing] = useState(false);
  const [initSuccess, setInitSuccess] = useState(false);

  // Auto-initialize demo data on load (works in both standalone & NitroStudio mode)
  const handleInitializeDemo = async () => {
    setIsInitializing(true);
    try {
      await executeGatewayTool('setup_demo', {}, callTool, isReady);
      await executeGatewayTool('setup_demo_policies', {}, callTool, isReady);
      setInitSuccess(true);
    } catch (e) {
      console.error('Demo auto-init error:', e);
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    if (!initSuccess) {
      handleInitializeDemo();
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 font-sans pb-10">
      {/* Top Header Navigation Bar */}
      <header className="sticky top-0 z-50 bg-[#0f172a]/95 backdrop-blur-md border-b border-sky-500/20 px-4 py-3 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Brand Logo */}
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-950/80 border border-sky-500/40 rounded-xl glow-cyan">
              <Shield className="w-6 h-6 text-sky-400 animate-pulse-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black tracking-tight text-white">SENTINEL GATEWAY</h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/30 font-bold">
                  ZERO-TRUST MCP
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Tool-Poisoning Interceptor & Cryptographic Provenance Ledger</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 flex-wrap justify-center">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'overview'
                  ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Overview
            </button>

            <button
              onClick={() => setActiveTab('attack')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'attack'
                  ? 'bg-rose-500 text-slate-950 shadow-md shadow-rose-500/20 font-bold'
                  : 'text-rose-400 hover:bg-rose-950/40'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              Attack Simulator
            </button>

            <button
              onClick={() => setActiveTab('feed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'feed'
                  ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Live Feed
            </button>

            <button
              onClick={() => setActiveTab('ledger')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'ledger'
                  ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              Ledger
            </button>

            <button
              onClick={() => setActiveTab('review')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'review'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <AlertOctagon className="w-3.5 h-3.5" />
              Review Queue
            </button>

            <button
              onClick={() => setActiveTab('topology')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'topology'
                  ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              Topology
            </button>
          </nav>

          {/* Quick Actions: Reset & Initialize */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={async () => {
                setIsInitializing(true);
                try {
                  await executeGatewayTool('reset_demo', {}, callTool, isReady);
                  setInitSuccess(false);
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('sentinel:reset'));
                  }
                } catch (e) {
                  console.error('Reset error:', e);
                } finally {
                  setIsInitializing(false);
                }
              }}
              disabled={isInitializing}
              className="px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 text-xs font-bold rounded-lg border border-rose-500/40 flex items-center gap-1.5 transition-all shadow-lg shadow-rose-950/40"
            >
              🗑️ Reset All (Wipe to 0)
            </button>

            <button
              onClick={async () => {
                await handleInitializeDemo();
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('sentinel:reset'));
                }
              }}
              disabled={isInitializing}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition-all"
            >
              <Zap className={`w-3.5 h-3.5 ${isInitializing ? 'animate-spin' : ''}`} />
              {initSuccess ? 'Demo Loaded ✓' : 'Load Demo Data'}
            </button>
          </div>
        </div>
      </header>

      {/* Guided Walkthrough Banner */}
      <div className="max-w-7xl mx-auto mt-4 px-4">
        <div className="p-3 bg-gradient-to-r from-sky-950/80 via-slate-900 to-indigo-950/80 border border-sky-500/30 rounded-xl flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold text-slate-200">Interactive Demo Steps:</span>
            <span className="text-slate-300">
              1️⃣ Click <strong className="text-emerald-400">Load Demo Data</strong> $\rightarrow$ 2️⃣ Go to <strong className="text-rose-400">Attack Simulator</strong> & click <strong className="text-rose-400">STAGE ATTACK</strong> $\rightarrow$ 3️⃣ Check <strong className="text-sky-300">Live Feed</strong> & <strong className="text-sky-300">Ledger</strong>!
            </span>
          </div>
          {initSuccess && (
            <span className="text-emerald-400 font-mono flex items-center gap-1 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" /> 3 MCP Servers & Policies Active
            </span>
          )}
        </div>
      </div>

      {/* Active Tab View */}
      <main className="max-w-7xl mx-auto pt-4 px-4">
        {activeTab === 'overview' && <DashboardStatsWidget />}
        {activeTab === 'attack' && <AttackDemoWidget />}
        {activeTab === 'feed' && <LiveFeedWidget />}
        {activeTab === 'ledger' && <LedgerViewerWidget />}
        {activeTab === 'review' && <ReviewQueueWidget />}
        {activeTab === 'topology' && <ServerTopologyWidget />}
      </main>
    </div>
  );
}
