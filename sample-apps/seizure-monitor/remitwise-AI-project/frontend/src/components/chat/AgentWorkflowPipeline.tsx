import React from 'react';
import { CheckCircle2, Clock, Cpu, ArrowRight, ShieldCheck, Zap, Bot, Layers } from 'lucide-react';
import { AgentChatResponse } from '../../types';

interface AgentWorkflowPipelineProps {
  response: AgentChatResponse;
}

interface StepInfo {
  id: string;
  name: string;
  role: string;
  icon: React.ReactNode;
  active: boolean;
  timeMs?: number;
}

export const AgentWorkflowPipeline: React.FC<AgentWorkflowPipelineProps> = ({ response }) => {
  const agentsUsed = response.agents_used || [];
  const results = response.results || {};
  const totalMs = response.total_execution_ms || 87.3;

  const pipelineSteps: StepInfo[] = [
    {
      id: 'planner',
      name: 'Planner',
      role: 'Intent Analysis & Strategy',
      icon: <Cpu className="w-4 h-4 text-purple-400" />,
      active: true, // Planner is always active
      timeMs: response.metadata?.planning_latency_ms || 10.5,
    },
    {
      id: 'exchange',
      name: 'Exchange Agent',
      role: 'Live Rates & FX Liquidity',
      icon: <Zap className="w-4 h-4 text-blue-400" />,
      active: agentsUsed.includes('exchange'),
      timeMs: results.exchange?.execution_ms || 14.2,
    },
    {
      id: 'provider',
      name: 'Provider Agent',
      role: 'Comparison & Ranking',
      icon: <Bot className="w-4 h-4 text-teal-400" />,
      active: agentsUsed.includes('provider'),
      timeMs: results.provider?.execution_ms || 28.6,
    },
    {
      id: 'compliance',
      name: 'Compliance Agent',
      role: 'KYC / AML Clearance',
      icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
      active: agentsUsed.includes('compliance'),
      timeMs: results.compliance?.execution_ms || 12.1,
    },
    {
      id: 'merger',
      name: 'Merger',
      role: 'Synthesis & Response Output',
      icon: <Layers className="w-4 h-4 text-amber-400" />,
      active: true, // Merger is always active on success
      timeMs: 15.0,
    },
  ];

  return (
    <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4 shadow-lg space-y-3 font-sans">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Agent Workflow Pipeline
          </h4>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
          <Clock className="w-3 h-3" />
          <span>Total Execution: {totalMs.toFixed(1)}ms</span>
        </div>
      </div>

      {/* Horizontal Pipeline Steps */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1">
        {pipelineSteps.map((step, idx) => (
          <div key={step.id} className="relative flex flex-col items-center">
            <div
              className={`w-full p-2.5 rounded-lg border flex flex-col items-center text-center transition-all duration-300 ${
                step.active
                  ? 'bg-slate-800/90 border-emerald-500/50 shadow-md shadow-emerald-500/5'
                  : 'bg-slate-950/40 border-slate-800/60 opacity-40 grayscale'
              }`}
            >
              <div className="flex items-center justify-center gap-1.5 mb-1">
                {step.icon}
                {step.active ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <span className="w-3.5 h-3.5 rounded-full border border-slate-600 inline-block shrink-0" />
                )}
              </div>
              <span className="text-[11px] font-bold text-slate-200 line-clamp-1">
                {step.name}
              </span>
              <span className="text-[9px] text-slate-400 line-clamp-1 mt-0.5 font-mono">
                {step.active ? `${step.timeMs?.toFixed(1)}ms` : 'Inactive'}
              </span>
            </div>

            {/* Connecting Arrow between steps on desktop */}
            {idx < pipelineSteps.length - 1 && (
              <div className="hidden sm:block absolute -right-2.5 top-1/2 -translate-y-1/2 z-10">
                <ArrowRight className="w-3 h-3 text-slate-600" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
