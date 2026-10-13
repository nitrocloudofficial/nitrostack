import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  CheckCircle2,
  Loader2,
  TrendingUp,
  ShieldCheck,
  Zap,
  ArrowRight,
  Terminal,
  Clock,
  Award,
} from 'lucide-react';
import { useTransfer } from '../contexts/TransferContext';
import { ConfidenceMeter } from '../components/common/ConfidenceMeter';
import { AgentStep } from '../types';

const AGENT_ICONS = ['🤖', '📈', '🛡️', '⚡'];
const AGENT_ACCENT_COLORS = [
  { ring: 'ring-blue-500/30', border: 'border-blue-500', bg: 'bg-blue-500/5', badge: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  { ring: 'ring-teal-500/30', border: 'border-teal-500', bg: 'bg-teal-500/5', badge: 'bg-teal-500/10 text-teal-500 border-teal-500/20' },
  { ring: 'ring-emerald-500/30', border: 'border-emerald-500', bg: 'bg-emerald-500/5', badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  { ring: 'ring-indigo-500/30', border: 'border-indigo-500', bg: 'bg-indigo-500/5', badge: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' },
];

interface AgentCardProps {
  agent: AgentStep;
  idx: number;
  isActive: boolean;
  isDone: boolean;
}

const AgentCard: React.FC<AgentCardProps> = ({ agent, idx, isActive, isDone }) => {
  const logsEndRef = useRef<HTMLDivElement>(null);
  const colors = AGENT_ACCENT_COLORS[idx];

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [agent.logs.length]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: idx * 0.08 }}
      className={`glass-panel rounded-2xl border transition-all duration-500 relative overflow-hidden ${
        isActive
          ? `${colors.border} ring-2 ${colors.ring} shadow-xl ${colors.bg}`
          : isDone
          ? 'border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-500/5'
          : 'border-slate-200/80 dark:border-slate-800 opacity-55'
      }`}
    >
      {/* Active top progress bar */}
      {isActive && (
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-500 via-teal-400 to-emerald-400">
          <div
            className="absolute inset-0 shimmer"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }}
          />
        </div>
      )}

      {/* Done check overlay badge */}
      {isDone && (
        <div className="absolute top-3 right-3">
          <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
          </div>
        </div>
      )}

      <div className="p-5 space-y-4">
        {/* Agent header */}
        <div className="flex items-start gap-3">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 transition-all duration-300 ${
              isActive
                ? 'bg-slate-900 shadow-lg animate-pulse-slow'
                : isDone
                ? 'bg-emerald-500/15'
                : 'bg-slate-100 dark:bg-slate-800'
            }`}
          >
            {AGENT_ICONS[idx]}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {agent.agentName}
              </h3>
              {/* Status badge */}
              {isDone ? (
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Done
                </span>
              ) : isActive ? (
                <span className="flex items-center gap-1 text-[10px] font-bold text-blue-500 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 animate-pulse">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" /> Thinking...
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 px-2 py-0.5 rounded-full bg-slate-200/50 dark:bg-slate-800/50">
                  Queued
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
              {agent.description}
            </p>
          </div>
        </div>

        {/* Terminal log stream — ChatGPT style */}
        <div className="rounded-xl bg-slate-950 border border-slate-800/80 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-800 text-[9px] text-slate-500 font-mono">
            <span className="flex items-center gap-1.5">
              <Terminal className="w-2.5 h-2.5 text-emerald-400" />
              Real-time Execution Log
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              Agent #{idx + 1}
            </span>
          </div>

          <div className="p-3 min-h-[90px] max-h-[130px] overflow-y-auto no-scrollbar space-y-1.5 font-mono text-[11px]">
            {agent.logs.length === 0 ? (
              <span className="text-slate-600 italic">
                {agent.status === 'idle' ? '▋ Awaiting pipeline execution...' : '▋ Initializing...'}
              </span>
            ) : (
              agent.logs.map((log, lIdx) => (
                <motion.div
                  key={lIdx}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex items-start gap-2 leading-snug ${
                    log.type === 'success'
                      ? 'text-emerald-400'
                      : log.type === 'warn'
                      ? 'text-amber-400'
                      : 'text-slate-300'
                  }`}
                >
                  <span className="text-slate-600 shrink-0 text-[10px] mt-px">
                    [{log.timestamp}]
                  </span>
                  <span>{log.message}</span>
                </motion.div>
              ))
            )}
            {/* Blinking cursor when active */}
            {isActive && (
              <span className="text-emerald-400 animate-pulse font-bold">▋</span>
            )}
            <div ref={logsEndRef} />
          </div>
        </div>

        {/* Output summary + confidence on completion */}
        <AnimatePresence>
          {isDone && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-3"
            >
              <div className="text-[11px] text-slate-600 dark:text-slate-400 border-t border-slate-200/40 dark:border-slate-800/60 pt-2.5 leading-relaxed">
                📋 {agent.outputSummary}
              </div>
              <ConfidenceMeter score={agent.confidenceScore} label="Agent Confidence" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export const AgentPipeline: React.FC = () => {
  const navigate = useNavigate();
  const { pipelineSteps, isPipelineRunning, activeAgentIndex, recommendation, runPipeline, request } = useTransfer();

  useEffect(() => {
    if (!isPipelineRunning && !recommendation) {
      runPipeline();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allCompleted = pipelineSteps.every((step) => step.status === 'completed');
  const completedCount = pipelineSteps.filter((s) => s.status === 'completed').length;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 font-mono font-bold text-[11px] border border-emerald-500/20">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          AUTONOMOUS MULTI-AGENT EXECUTION PIPELINE
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
          AI Agents Optimizing Your Transfer
        </h1>

        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-mono">
          Corridor:{' '}
          <span className="text-slate-700 dark:text-slate-200 font-semibold">
            {request.fromCountry.flag} {request.fromCountry.name} ({request.fromCountry.currency}) →{' '}
            {request.toCountry.flag} {request.toCountry.name} ({request.toCountry.currency})
          </span>
          {' '}| Amount:{' '}
          <span className="text-blue-500 font-bold">
            {request.fromCountry.currencySymbol}{request.amount.toLocaleString()}
          </span>
        </p>
      </div>

      {/* Overall Progress Bar */}
      <div className="glass-panel rounded-2xl p-4 border border-slate-200/60 dark:border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono">
          <span>Pipeline Progress</span>
          <span className="font-bold text-slate-700 dark:text-slate-200">
            {completedCount} / {pipelineSteps.length} Agents Complete
          </span>
        </div>
        <div className="h-2 bg-slate-200/60 dark:bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-teal-400 to-emerald-500"
            initial={{ width: '0%' }}
            animate={{ width: `${(completedCount / pipelineSteps.length) * 100}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-mono text-slate-400">
          {pipelineSteps.map((step, i) => (
            <span
              key={step.id}
              className={step.status === 'completed' ? 'text-emerald-500 font-bold' : step.status === 'running' ? 'text-blue-500 animate-pulse font-bold' : ''}
            >
              {i + 1}. {step.agentRole}
            </span>
          ))}
        </div>
      </div>

      {/* 4 Agent Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {pipelineSteps.map((agent, idx) => {
          const isActive = activeAgentIndex === idx && isPipelineRunning;
          const isDone = agent.status === 'completed';
          return (
            <AgentCard
              key={agent.id}
              agent={agent}
              idx={idx}
              isActive={isActive}
              isDone={isDone}
            />
          );
        })}
      </div>

      {/* Completion banner */}
      <AnimatePresence>
        {allCompleted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.5, type: 'spring', damping: 18 }}
            className="relative p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-blue-600 via-teal-500 to-emerald-500 text-white text-center space-y-5 overflow-hidden shadow-2xl shadow-blue-500/30"
          >
            {/* Shimmer overlay */}
            <div className="absolute inset-0 shimmer opacity-40 pointer-events-none" />

            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto text-3xl shadow-lg">
              🎉
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                AI Optimization Complete!
              </h2>
              <p className="text-sm text-blue-100 mt-2 max-w-md mx-auto">
                All 4 agents verified rates, compliance, timing, and dispatch. Your personalized recommendation is ready.
              </p>
            </div>

            <div className="grid grid-cols-4 gap-3 max-w-sm mx-auto text-center text-xs">
              {pipelineSteps.map((step, i) => (
                <div key={i} className="space-y-1">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center mx-auto text-base">
                    {AGENT_ICONS[i]}
                  </div>
                  <div className="text-blue-100 font-medium leading-tight">{step.agentRole}</div>
                  <div className="text-emerald-200 font-bold">{step.confidenceScore}%</div>
                </div>
              ))}
            </div>

            <button
              id="view-recommendation-btn"
              onClick={() => navigate('/recommendation')}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white text-slate-900 font-extrabold text-sm shadow-xl hover:bg-slate-50 hover:scale-105 active:scale-95 transition-all duration-200"
            >
              <Award className="w-4 h-4 text-blue-600" />
              <span>View Winner Recommendation</span>
              <ArrowRight className="w-4 h-4 text-blue-600" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
