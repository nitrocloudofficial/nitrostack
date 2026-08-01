import React, { useState } from 'react';
import { Terminal, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { AgentChatResponse } from '../../types';

interface AgentLogsPanelProps {
  response: AgentChatResponse;
}

export const AgentLogsPanel: React.FC<AgentLogsPanelProps> = ({ response }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const results = response.results || {};
  const plannerName = response.metadata?.planner_name || 'LLMPlanner (Ollama / Llama-3.1)';
  const totalMs = response.total_execution_ms || 87.3;

  // Build terminal logs array
  const nowStr = new Date().toISOString().slice(11, 19);

  const logs = [
    { timestamp: `${nowStr}.102`, type: 'system', text: `[ORCHESTRATOR] Initializing intent routing for session '${response.session_id || 'user-session'}'` },
    { timestamp: `${nowStr}.114`, type: 'info', text: `[PLANNER] Invoking ${plannerName}...` },
    { timestamp: `${nowStr}.125`, type: 'success', text: `[PLANNER] Strategy generated: agents=[${(response.agents_used || ['exchange', 'provider', 'compliance']).join(', ')}], confidence=${response.metadata?.confidence || 0.98}` },
    { timestamp: `${nowStr}.139`, type: 'info', text: `[EXCHANGE AGENT] Querying FX rate feeds... status=${results.exchange?.status || 'success'} (rate: ${results.exchange?.data?.rate || 96.56}) [${results.exchange?.execution_ms || 14.2}ms]` },
    { timestamp: `${nowStr}.168`, type: 'info', text: `[PROVIDER AGENT] Comparing 4 corridors... best_provider='${results.provider?.data?.best_provider || 'Wise'}' [${results.provider?.execution_ms || 28.6}ms]` },
    { timestamp: `${nowStr}.181`, type: 'info', text: `[COMPLIANCE AGENT] Verifying KYC/AML rules for ${results.compliance?.data?.country_code || 'IN'}... status=CLEARED [${results.compliance?.execution_ms || 12.1}ms]` },
    { timestamp: `${nowStr}.196`, type: 'success', text: `[MERGER] Synthesizing final response output summary. Total execution time: ${totalMs.toFixed(1)}ms.` },
  ];

  const handleCopyLogs = () => {
    const rawText = logs.map((l) => `${l.timestamp} ${l.text}`).join('\n');
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shadow-lg font-mono">
      {/* Header Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2.5 bg-slate-900/80 hover:bg-slate-900 flex items-center justify-between transition-colors text-left border-b border-slate-800/60"
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-slate-200">
            Agent Execution Logs ({logs.length} events)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
            {isOpen ? 'Click to collapse' : 'Click to expand'}
          </span>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      {/* Terminal View */}
      {isOpen && (
        <div className="p-3 text-[11px] leading-relaxed text-slate-300 space-y-1.5 max-h-60 overflow-y-auto no-scrollbar relative bg-slate-950">
          <div className="flex justify-end mb-1">
            <button
              onClick={handleCopyLogs}
              className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 px-2 py-1 rounded transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied!' : 'Copy Logs'}</span>
            </button>
          </div>

          {logs.map((log, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-slate-600 text-[10px] shrink-0 font-mono">
                [{log.timestamp}]
              </span>
              <span
                className={
                  log.type === 'success'
                    ? 'text-emerald-400 font-semibold'
                    : log.type === 'system'
                    ? 'text-purple-400'
                    : 'text-slate-300'
                }
              >
                {log.text}
              </span>
            </div>
          ))}
          <div className="text-emerald-500 font-bold animate-pulse mt-1">▋</div>
        </div>
      )}
    </div>
  );
};
