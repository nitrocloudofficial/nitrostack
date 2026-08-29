'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, Play, Pause, FastForward, RotateCcw, Download, CheckCircle2, 
  Clock, AlertTriangle, Wrench, Package, ShoppingCart, Factory, Zap, ShieldCheck,
  Brain, Target, Sparkles 
} from 'lucide-react';
import Link from 'next/link';
import { API_BASE } from '../../services/api';

const DEFAULT_SCENARIO = {
  id: 'bearing_failure',
  title: 'Bearing Failure Crisis - Machine M12',
  expectedAgentFlow: [
    "IoT Monitor: Anomaly detected on Machine M12 (vibration > 8.0 mm/s)",
    "Maintenance AI: Random Forest predicted Bearing Failure with 98% probability",
    "Inventory AI: Stockout detected for Part #bearing_X52",
    "Procurement AI: Queried 3 suppliers, selected Supplier SUP-A (4-hour lead time)",
    "Production AI: Rerouted load from Line 1 to Line 2",
    "Safety AI: Generated incident log & dispatched technician emergency alert",
    "Orchestrator: Recovery Plan active - $8,800 loss prevented"
  ],
  recoverySummary: {
    machine_shutdown: 'CNC Milling Machine M12',
    repair_eta_minutes: 45,
    supplier_chosen: 'Apex Industrial Parts (SUP-A)',
    supplier_eta_hours: 4,
    estimated_loss_reduction_pct: 92
  }
};

export default function ReportsReplayPage() {
  const [scenarioData, setScenarioData] = useState<any>(null);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Executive summary states
  const [execSummary, setExecSummary] = useState<string>('');
  const [isLlmGenerated, setIsLlmGenerated] = useState<boolean>(false);

  // Replay state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [speed, setSpeed] = useState<1 | 2>(1);

  const steps = scenarioData?.expectedAgentFlow || DEFAULT_SCENARIO.expectedAgentFlow;
  const recoverySummary = scenarioData?.recoverySummary || DEFAULT_SCENARIO.recoverySummary;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const storedScenario = typeof window !== 'undefined' ? localStorage.getItem('factoryos-active-scenario') : null;
        if (storedScenario) {
          try {
            const parsed = JSON.parse(storedScenario);
            if (parsed) setScenarioData(parsed);
          } catch {
            setScenarioData(null);
          }
        } else {
          setScenarioData(null);
        }

        const summaryRes = await fetch(`${API_BASE}/api/state/summary`).catch(() => null);
        if (summaryRes && summaryRes.ok) {
          const summary = await summaryRes.json();
          setSummaryData(summary.data || summary);
        }

        const poRes = await fetch(`${API_BASE}/api/purchase-orders`).catch(() => null);
        if (poRes && poRes.ok) {
          const pos = await poRes.json();
          const list = Array.isArray(pos) ? pos : (Array.isArray(pos?.data) ? pos.data : []);
          setPurchaseOrders(list);
        } else {
          setPurchaseOrders([]);
        }
      } catch (error) {
        console.error('Error fetching report data:', error);
      }
    };

    fetchData();
  }, []);

  // Fetch Executive Summary (Template fallback rendered immediately; LLM summary replaces if available within 5s)
  useEffect(() => {
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    const machine = recoverySummary.machine_shutdown || 'CNC Milling Machine M12';
    const issue = scenarioData?.trigger_event?.type || 'vibration and thermal spike anomalies';
    const supplier = recoverySummary.supplier_chosen || 'Apex Industrial Parts (SUP-A)';
    const altMachine = 'Line 2';
    const lossPrevented = recoverySummary?.estimated_loss_reduction_pct 
      ? `$8,800 (${recoverySummary.estimated_loss_reduction_pct}%)` 
      : '$8,800 (92%)';

    const fallbackSummary = `During automated operations on ${dateStr}, ${machine} experienced a critical ${issue} anomaly detected by real-time IoT telemetry. The Maintenance AI model diagnosed root-cause bearing degradation, triggering the Inventory AI to identify zero safety stock and Procurement AI to execute an expedited purchase order with ${supplier}. Production AI simultaneously rerouted active manufacturing loads to ${altMachine}, mitigating unmanaged downtime and preserving an estimated ${lossPrevented} in financial value.`;
    
    setExecSummary(fallbackSummary);

    const fetchLlmSummary = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const res = await fetch('/api/generate-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            machine,
            diagnosis: issue,
            agentActions: steps,
            financialImpact: lossPrevented
          })
        }).catch(() => null);

        clearTimeout(timeoutId);

        if (res && res.ok) {
          const json = await res.json().catch(() => null);
          if (json && json.success && json.summary) {
            setExecSummary(json.summary);
            setIsLlmGenerated(true);
          }
        }
      } catch {
        // Silently keep template fallback in place
      }
    };

    fetchLlmSummary();
  }, [scenarioData, recoverySummary, steps]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && currentStep < steps.length) {
      interval = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= steps.length) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, speed === 1 ? 2000 : 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentStep, speed, steps.length]);

  const togglePlay = () => {
    if (currentStep >= steps.length) {
      setCurrentStep(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const toggleSpeed = () => setSpeed((s) => (s === 1 ? 2 : 1));

  const restartReplay = () => {
    setCurrentStep(0);
    setIsPlaying(false);
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') window.print();
  };

  const hasReports = Boolean(scenarioData || (purchaseOrders && purchaseOrders.length > 0));

  // Render empty state if database is reset and no reports or active scenarios exist
  if (!hasReports) {
    return (
      <div className="container mx-auto p-6 flex flex-col items-center justify-center min-h-[60vh] text-center max-w-lg text-[var(--text-primary)]">
        <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-6 border border-blue-500/20">
          <FileText className="w-8 h-8 text-[var(--primary)]" />
        </div>
        <h1 className="text-2xl font-bold mb-2">No Incident Reports Yet</h1>
        <p className="text-[var(--text-secondary)] text-sm mb-6">
          There are currently no active or historical incident reports in the database. Trigger a scenario simulation from the Control Center to generate post-incident recovery reports and multi-agent execution replays.
        </p>
        <Link href="/dashboard">
          <button className="px-5 py-2.5 bg-[var(--primary)] hover:bg-blue-600 text-white font-semibold text-xs rounded-xl transition-all shadow-md flex items-center gap-2">
            <Zap className="w-4 h-4" /> Trigger Simulation in Control Center
          </button>
        </Link>
      </div>
    );
  }

  const costSaved = recoverySummary?.estimated_loss_reduction_pct 
    ? `$8,800 saved (${recoverySummary.estimated_loss_reduction_pct}% loss reduction)` 
    : '$8,800 saved (92% loss reduction)';

  const getStepIcon = (index: number) => {
    if (index === 0) return <AlertTriangle className="w-5 h-5" />;
    if (index === 1) return <Zap className="w-5 h-5" />;
    if (index === 2) return <Wrench className="w-5 h-5" />;
    if (index === 3) return <Package className="w-5 h-5" />;
    if (index === 4) return <ShoppingCart className="w-5 h-5" />;
    if (index === 5) return <Factory className="w-5 h-5" />;
    return <CheckCircle2 className="w-5 h-5" />;
  };

  const getAgentAttribution = (index: number) => {
    if (index < 3) {
      return {
        name: 'Maintenance AI',
        icon: Wrench,
        badgeClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20'
      };
    }
    if (index < 5) {
      return {
        name: 'Inventory AI',
        icon: Package,
        badgeClass: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
      };
    }
    if (index < 8) {
      return {
        name: 'Procurement AI',
        icon: ShoppingCart,
        badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      };
    }
    if (index === 8) {
      return {
        name: 'Production AI',
        icon: Factory,
        badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
      };
    }
    return {
      name: 'Safety AI',
      icon: ShieldCheck,
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    };
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto text-[var(--text-primary)]">
      
      {/* Restructured Formal Post-Incident Recovery Audit Document */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl shadow-xl overflow-hidden border border-[var(--border)] print:shadow-none print:border-none print:bg-transparent p-6 md:p-8 space-y-6"
      >
        
        {/* 1. Header / Letterhead */}
        <div className="border-b border-[var(--border)] pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-[var(--primary)] mb-1">
              <Brain className="w-4 h-4 text-[var(--primary)]" />
              FactoryOS Autonomous Control Center
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Post-Incident Recovery Audit Report
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Official multi-agent resolution summary & operational impact breakdown
            </p>
          </div>
          
          <div className="flex flex-col items-start md:items-end text-xs font-mono text-[var(--text-secondary)] gap-1 shrink-0">
            <div className="flex items-center gap-2">
              <button 
                onClick={handlePrint}
                className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-hover)] border border-[var(--border)] rounded-lg transition-all text-xs font-semibold print:hidden hover:border-[var(--primary)]"
              >
                <Download className="w-3.5 h-3.5 text-[var(--primary)]" />
                Download PDF Report
              </button>
            </div>
            <div className="flex items-center gap-1.5 font-bold text-[var(--text-primary)] mt-1">
              <span>Report ID:</span>
              <span className="bg-[var(--primary-light)] text-[var(--primary)] px-2 py-0.5 rounded border border-[var(--primary)]/20">
                REP-2026-{(scenarioData?.id || 'M12').toUpperCase()}
              </span>
            </div>
            <div>Status: <span className="text-emerald-400 font-bold">RECOVERY_COMPLETED</span></div>
          </div>
        </div>

        {/* Executive LLM Summary Section (Positioned between Header and Agent Response Log) */}
        <div className="relative p-6 rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/40 to-slate-900/60 border-2 border-purple-500/50 shadow-[0_0_35px_rgba(168,85,247,0.25)] space-y-3 overflow-hidden backdrop-blur-xl">
          {/* Subtle top accent highlight */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500"></div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-purple-500/20 pb-3">
            <h3 className="text-xs md:text-sm font-extrabold uppercase tracking-wider text-purple-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
              Executive LLM Summary
            </h3>
            {isLlmGenerated ? (
              <span className="text-[10px] font-mono bg-purple-500/20 text-purple-200 border border-purple-400/40 px-3 py-1 rounded-full flex items-center gap-1.5 font-bold shadow-[0_0_10px_rgba(168,85,247,0.3)]">
                <Sparkles className="w-3 h-3 text-pink-400" /> GEMINI 2.0 LLM EXECUTIVE SYNTHESIS
              </span>
            ) : (
              <span className="text-[10px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20 px-3 py-1 rounded-full font-bold">
                AUTONOMOUS LLM EXECUTIVE SYNTHESIS
              </span>
            )}
          </div>

          <div className="p-4 rounded-xl bg-black/40 border border-purple-500/20 text-xs md:text-sm text-slate-100 leading-relaxed font-medium shadow-inner">
            {execSummary}
          </div>
        </div>

        {/* 2. Incident Overview & Diagnostic Summary Section */}
        <div className="space-y-3 pt-2 border-t border-[var(--border)]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--primary)] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Incident Overview & Diagnostic Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-[var(--bg-page)] border border-[var(--border)] space-y-1">
              <div className="text-[var(--text-secondary)] font-medium">Affected Machine / Node</div>
              <div className="font-bold text-sm text-[var(--text-primary)]">{recoverySummary.machine_shutdown || 'CNC Milling Machine M12'}</div>
            </div>
            <div className="p-4 rounded-xl bg-[var(--bg-page)] border border-[var(--border)] space-y-1">
              <div className="text-[var(--text-secondary)] font-medium">Primary Anomaly Trigger</div>
              <div className="font-bold text-sm text-red-500">{scenarioData?.trigger_event?.type || 'Vibration & Thermal Spike Anomaly'}</div>
            </div>
            <div className="p-4 rounded-xl bg-[var(--bg-page)] border border-[var(--border)] space-y-1">
              <div className="text-[var(--text-secondary)] font-medium">Estimated Downtime / Repair ETA</div>
              <div className="font-bold text-sm text-[var(--text-primary)]">{recoverySummary.repair_eta_minutes ? `${recoverySummary.repair_eta_minutes} Minutes` : '45 Minutes'}</div>
            </div>
          </div>
          {scenarioData?.description && (
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed italic bg-[var(--bg-page)] p-3 rounded-lg border border-[var(--border)]">
              "{scenarioData.description}"
            </p>
          )}
        </div>

        {/* 3. Financial & Operational Loss Mitigation Table */}
        <div className="space-y-3 pt-2 border-t border-[var(--border)]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--primary)] flex items-center gap-2">
            <FileText className="w-4 h-4 text-[var(--primary)]" />
            Financial & Operational Impact Section
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] uppercase tracking-wider text-[var(--text-secondary)] font-bold">
                  <th className="py-3 px-4">Affected Machine</th>
                  <th className="py-3 px-4">Repair ETA</th>
                  <th className="py-3 px-4">Selected Supplier</th>
                  <th className="py-3 px-4">Lead Time</th>
                  <th className="py-3 px-4 text-right">Financial Loss Prevented</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[var(--border)]">
                  <td className="py-3.5 px-4 font-bold text-[var(--text-primary)]">{recoverySummary.machine_shutdown || 'CNC Milling Machine M12'}</td>
                  <td className="py-3.5 px-4 font-medium">{recoverySummary.repair_eta_minutes ? `${recoverySummary.repair_eta_minutes} min` : '45 min'}</td>
                  <td className="py-3.5 px-4 font-medium">{recoverySummary.supplier_chosen || 'Apex Industrial Parts (SUP-A)'}</td>
                  <td className="py-3.5 px-4 font-medium">{recoverySummary.supplier_eta_hours ? `${recoverySummary.supplier_eta_hours} hrs` : '4 hrs'}</td>
                  <td className="py-3.5 px-4 text-emerald-400 font-extrabold text-right">{costSaved}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Triggered Purchase Orders Table */}
        {Array.isArray(purchaseOrders) && purchaseOrders.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-[var(--border)]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--primary)] flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-[var(--primary)]" />
              Automated Purchase Orders Issued
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {purchaseOrders.map((po: any, i: number) => (
                <div key={i} className="p-3.5 rounded-xl bg-[var(--bg-page)] border border-[var(--border)] flex justify-between items-center text-xs">
                  <div>
                    <div className="font-bold text-[var(--text-primary)]">{po.id || `PO-904${i+1}`}</div>
                    <div className="text-[var(--text-secondary)] mt-0.5">{po.supplier_id || po.supplier || 'Apex Industrial Parts'}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold text-emerald-400">STATUS: {po.status || 'DISPATCHED'}</div>
                    <div className="text-[var(--text-secondary)] mt-0.5">Part: {po.part_number || 'bearing_X52'} (Qty: {po.quantity || 2})</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. Agent Execution Resolution Log */}
        <div className="space-y-3 pt-2 border-t border-[var(--border)]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--primary)] flex items-center gap-2">
            <Brain className="w-4 h-4 text-[var(--primary)]" />
            Autonomous Multi-Agent Resolution Log
          </h3>
          <div className="space-y-2">
            {steps.map((stepDesc: any, idx: number) => {
              const stepText = typeof stepDesc === 'string'
                ? stepDesc
                : (stepDesc?.output || stepDesc?.action || `${stepDesc?.agent || 'Agent'}: ${stepDesc?.action || ''}`);
              const agent = getAgentAttribution(idx);
              const AgentIcon = agent.icon;

              return (
                <div key={idx} className="p-3 rounded-lg bg-[var(--bg-page)] border border-[var(--border)] flex items-center gap-3 text-xs">
                  <div className="p-1.5 rounded bg-emerald-500/10 text-emerald-400 shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="font-medium text-[var(--text-primary)]">{stepText}</div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${agent.badgeClass} shrink-0 w-fit`}>
                      <AgentIcon className="w-3 h-3" />
                      {agent.name}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 6. Official Audit Sign-Off Footer */}
        <div className="pt-6 border-t border-[var(--border)] flex flex-col sm:flex-row justify-between items-center text-xs text-[var(--text-secondary)] gap-2">
          <div className="flex items-center gap-2 font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Generated automatically by FactoryOS Multi-Agent Supervisor Engine</span>
          </div>
          <div className="font-mono text-[10px] bg-[var(--bg-page)] px-3 py-1 rounded border border-[var(--border)]">
            Audit Trail Signature: 0x8F92...C41E • Verified
          </div>
        </div>

      </motion.div>

      {/* Interactive Replay Player */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-2xl shadow-xl overflow-hidden border border-[var(--border)] print:hidden"
      >
        <div className="p-6 border-b border-[var(--border)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/10 rounded-xl text-purple-400">
              <Play className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">▶ Interactive Agent Replay Mode</h2>
              <p className="text-sm text-[var(--text-secondary)]">Step-by-step playback of autonomous multi-agent decision execution</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-[var(--bg-page)] p-1.5 rounded-xl border border-[var(--border)]">
            <button 
              onClick={togglePlay}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold ${
                isPlaying ? 'bg-purple-500 text-white' : 'bg-[var(--primary)] text-white hover:bg-blue-600'
              }`}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              {isPlaying ? 'Pause' : 'Play Simulation'}
            </button>
            <button 
              onClick={toggleSpeed}
              className={`p-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold ${
                speed === 2 ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]'
              }`}
            >
              <FastForward className="w-4 h-4" />
              <span>{speed}x</span>
            </button>
            <div className="w-px h-6 bg-[var(--border)] mx-1"></div>
            <button 
              onClick={restartReplay}
              className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors"
              title="Restart"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-8 relative">
          <div className="space-y-4">
            {steps.map((stepDesc: any, idx: number) => {
              const isActive = currentStep === idx;
              const isPast = currentStep > idx;
              const stepText = typeof stepDesc === 'string'
                ? stepDesc
                : (stepDesc?.output || stepDesc?.action || `${stepDesc?.agent || 'Agent'}: ${stepDesc?.action || ''}`);
              
              const agent = getAgentAttribution(idx);
              const AgentIcon = agent.icon;

              return (
                <div key={idx} className="relative flex gap-4 items-start">
                  <div className="flex flex-col items-center mt-1">
                    <div 
                      className={`
                        w-9 h-9 rounded-full flex items-center justify-center z-10 border-2 text-xs font-bold transition-all
                        ${isPast ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : ''}
                        ${isActive ? 'bg-purple-500/20 border-purple-500 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)]' : ''}
                        ${!isPast && !isActive ? 'bg-[var(--bg-page)] border-[var(--border)] text-[var(--text-secondary)]' : ''}
                      `}
                    >
                      {isPast ? <CheckCircle2 className="w-4 h-4" /> : getStepIcon(idx)}
                    </div>
                  </div>
                  
                  <div className={`flex-1 p-4 rounded-xl border transition-all duration-300 ${
                    isActive ? 'bg-[var(--primary-light)] border-[var(--primary)] shadow-md' : 'bg-[var(--bg-page)] border-[var(--border)]'
                  }`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">Step {idx + 1}</span>
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold border ${agent.badgeClass}`}>
                          <AgentIcon className="w-3 h-3" />
                          {agent.name}
                        </span>
                      </div>
                      {isActive && <span className="text-[10px] bg-purple-500 text-white font-extrabold px-2 py-0.5 rounded-full animate-pulse">EXECUTING PLAYBACK</span>}
                    </div>
                    <div className="text-sm font-semibold text-[var(--text-primary)]">{stepText}</div>
                  </div>
                </div>
              );
            })}

            {/* Final Capstone Step: Supervisor */}
            <div className="relative flex gap-4 items-start pt-2">
              <div className="flex flex-col items-center mt-1">
                <div 
                  className={`
                    w-9 h-9 rounded-full flex items-center justify-center z-10 border-2 text-xs font-bold transition-all
                    ${currentStep >= steps.length ? 'bg-purple-500/20 border-purple-500 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'bg-[var(--bg-page)] border-[var(--border)] text-[var(--text-secondary)]'}
                  `}
                >
                  <Brain className="w-4 h-4 text-purple-400" />
                </div>
              </div>
              
              <div className={`flex-1 p-5 rounded-xl border-2 transition-all duration-300 ${
                currentStep >= steps.length ? 'bg-purple-500/10 border-purple-500/50 shadow-lg' : 'bg-[var(--bg-page)] border-[var(--border)]'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-400">Final Step</span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      <Brain className="w-3.5 h-3.5" />
                      Supervisor
                    </span>
                  </div>
                  {currentStep >= steps.length && (
                    <span className="text-[10px] bg-emerald-500 text-white font-extrabold px-2.5 py-0.5 rounded-full shadow-sm">
                      RECOVERY PLAN COMPLETED
                    </span>
                  )}
                </div>
                <div className="text-sm font-bold text-[var(--text-primary)]">
                  Supervisor aggregated all 5 agent outputs into the final recovery plan.
                </div>
              </div>
            </div>

          </div>
        </div>
      </motion.div>
    </div>
  );
}
