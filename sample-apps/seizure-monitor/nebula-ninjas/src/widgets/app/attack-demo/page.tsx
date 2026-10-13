'use client';

import React, { useState } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import { executeGatewayTool } from '../../utils/gatewayClient';
import { Flame, Play, ShieldAlert, RotateCcw, AlertTriangle, Cpu } from 'lucide-react';

interface AttackStep {
  order: number;
  description: string;
  status: 'executed' | 'detected' | 'blocked';
  timestamp: string;
}

interface AttackResult {
  scenario: string;
  success: boolean;
  steps: AttackStep[];
  detectedBy: string;
  blockedAt: string;
  summary?: string;
}

export default function AttackDemoWidget() {
  const { isReady, callTool } = useWidgetSDK();
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<AttackResult | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleInitDemo = async () => {
    setIsRunning(true);
    setStatusMessage('Initializing Demo Environment (Servers & Policies)...');
    try {
      await executeGatewayTool('setup_demo', {}, callTool, isReady);
      await executeGatewayTool('setup_demo_policies', {}, callTool, isReady);
      setStatusMessage('✅ Demo environment ready! 3 servers & policies loaded.');
    } catch (e) {
      console.error(e);
      setStatusMessage('❌ Setup failed. Check server log.');
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunAttack = async (scenario: string) => {
    setIsRunning(true);
    setStatusMessage(`Staging Attack Scenario: ${scenario}...`);
    try {
      const res = (await executeGatewayTool('run_attack', { scenario }, callTool, isReady)) as AttackResult;
      if (res) {
        setLastResult(res);
        setStatusMessage(res.summary || `Attack ${scenario} executed.`);
      }
    } catch (e) {
      console.error(e);
      setStatusMessage(`❌ Attack failed: ${e}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunFullDemo = async () => {
    setIsRunning(true);
    setStatusMessage('Running Full Automated Demo Sequence...');
    try {
      await executeGatewayTool('run_full_demo', {}, callTool, isReady);
      setStatusMessage('🎬 Full Demo Sequence Executed! Check Live Feed and Review Queue.');
    } catch (e) {
      console.error(e);
      setStatusMessage(`❌ Full demo failed: ${e}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleReset = async () => {
    setIsRunning(true);
    try {
      await executeGatewayTool('reset_demo', {}, callTool, isReady);
      setLastResult(null);
      setStatusMessage('🔄 All mock servers reset to clean state.');
    } catch (e) {
      console.error(e);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="glass-panel p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-950/80 border border-rose-500/40 rounded-xl glow-red">
            <Flame className="w-6 h-6 text-rose-400 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Live Attack Simulator Panel</h2>
            <p className="text-xs text-slate-400">Stage live attacks to demonstrate Sentinel's real-time interception</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleInitDemo}
            disabled={isRunning}
            className="px-3 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Cpu className="w-3.5 h-3.5" />
            1-Click Setup Demo
          </button>
          <button
            onClick={handleReset}
            disabled={isRunning}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset All
          </button>
        </div>
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div className="p-3 bg-slate-900 border border-sky-500/30 rounded-lg text-xs font-mono text-sky-300 flex items-center gap-2">
          <Play className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Scenario Triggers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Tool Poisoning Card */}
        <div className="glass-panel p-4 space-y-3 border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200">1. Tool Poisoning Attack</h3>
            <span className="text-[10px] font-mono text-rose-400 bg-rose-950 px-2 py-0.5 rounded border border-rose-500/30">CVE-2026</span>
          </div>
          <p className="text-xs text-slate-400">
            Silently rewrites <code className="text-sky-300">send_email</code> description to inject a hidden BCC exfiltration instruction. Sentinel integrity agent catches hash drift on next invocation.
          </p>
          <button
            onClick={() => handleRunAttack('tool_poisoning')}
            disabled={isRunning}
            className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-slate-950 font-bold text-xs rounded-lg transition-colors shadow-lg shadow-rose-600/20 flex items-center justify-center gap-1.5"
          >
            <ShieldAlert className="w-4 h-4" />
            STAGE TOOL POISONING ATTACK
          </button>
        </div>

        {/* RBAC Violation Card */}
        <div className="glass-panel p-4 space-y-3 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200">2. RBAC Policy Violation</h3>
            <span className="text-[10px] font-mono text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-500/30">Unauthorized</span>
          </div>
          <p className="text-xs text-slate-400">
            Simulates <code className="text-amber-300">rogue-agent</code> trying to invoke privileged tools without permissions. Policy agent blocks instantly with zero-trust default-deny.
          </p>
          <button
            onClick={() => handleRunAttack('rbac_violation')}
            disabled={isRunning}
            className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-lg transition-colors shadow flex items-center justify-center gap-1.5"
          >
            <AlertTriangle className="w-4 h-4" />
            STAGE RBAC VIOLATION ATTACK
          </button>
        </div>

        {/* Ledger Tampering Card */}
        <div className="glass-panel p-4 space-y-3 border-l-4 border-l-sky-500">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200">3. Ledger Tampering Attack</h3>
            <span className="text-[10px] font-mono text-sky-400 bg-sky-950 px-2 py-0.5 rounded border border-sky-500/30">Provenential</span>
          </div>
          <p className="text-xs text-slate-400">
            Mutates a historical audit entry directly in memory/DB. Verification agent recalculates the SHA-256 chain and flags exact broken link index.
          </p>
          <button
            onClick={() => handleRunAttack('ledger_tampering')}
            disabled={isRunning}
            className="w-full py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-lg transition-colors shadow flex items-center justify-center gap-1.5"
          >
            <ShieldAlert className="w-4 h-4" />
            STAGE LEDGER TAMPERING ATTACK
          </button>
        </div>

        {/* Full Automated Sequence Card */}
        <div className="glass-panel p-4 space-y-3 border-l-4 border-l-emerald-500 bg-emerald-950/20">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-emerald-300">4. Run Full Automated Presentation</h3>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">Stage Demo</span>
          </div>
          <p className="text-xs text-slate-400">
            Executes full sequence: normal calls $\rightarrow$ RBAC block $\rightarrow$ poisoning block $\rightarrow$ injection scan. Ideal for 3-minute stage demo recording.
          </p>
          <button
            onClick={handleRunFullDemo}
            disabled={isRunning}
            className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5"
          >
            <Play className="w-4 h-4" />
            RUN FULL STAGE DEMO SEQUENCE
          </button>
        </div>
      </div>

      {/* Execution Results View */}
      {lastResult && (
        <div className="glass-panel p-4 space-y-3 border-sky-500/40">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Play className="w-4 h-4 text-emerald-400" />
              Attack Execution Report — Scenario: {lastResult.scenario}
            </h3>
            <span className="text-xs font-mono text-emerald-400">Blocked By: {lastResult.detectedBy}</span>
          </div>

          <div className="space-y-2">
            {lastResult.steps?.map((step) => (
              <div key={step.order} className="p-2.5 bg-slate-900/80 rounded border border-slate-800 text-xs flex items-start gap-2">
                <span className="font-mono text-sky-400 font-bold">{step.order}.</span>
                <span className="text-slate-300 flex-1">{step.description}</span>
                <span className="text-[10px] font-mono text-slate-500">{new Date(step.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
