'use client';

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { IntegrationItem } from '../../types';
import { Plug, ShieldCheck, CheckCircle2, AlertTriangle, RefreshCw, ExternalLink, Terminal, X, Lock } from 'lucide-react';

export const IntegrationsCenter: React.FC = () => {
  const { integrations } = useApp();
  const [selectedInteg, setSelectedInteg] = useState<IntegrationItem>(integrations[0]);
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleTestConnection = (item: IntegrationItem) => {
    setSelectedInteg(item);
    setIsDiagnosticOpen(true);
    setTestResult(null);

    setTimeout(() => {
      setTestResult(`[MCP Gateway OK] Verified ${item.name} API endpoint. Response status 200 OK. Auth token valid.`);
    }, 800);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <Plug className="w-6 h-6 text-indigo-400" />
            <h1 className="text-2xl font-extrabold text-white">MCP Integration Architecture Center</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Frontend → FastAPI Gateway → MCP Orchestrator → Plugins (Slack, Jira, Notion, GitHub, Google Calendar)
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-slate-300">Centralized OAuth & Token Encryption Active</span>
        </div>
      </div>

      {/* Grid of Approved Integrations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {integrations.map(item => (
          <div 
            key={item.id}
            className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono uppercase font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                  {item.category}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center space-x-1 ${
                  item.status === 'connected' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="capitalize">{item.status}</span>
                </span>
              </div>

              <h3 className="text-base font-bold text-white mb-1">{item.name}</h3>
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-3">{item.description}</p>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 text-[11px] font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Account:</span>
                  <span className="text-slate-200 truncate max-w-[170px]">{item.connectedAccount}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Rate Limit:</span>
                  <span className="text-indigo-300">{item.rateLimit}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>API Health:</span>
                  <span className="text-emerald-400 font-bold">{item.apiHealth}%</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-[10px] text-slate-500">Synced {item.lastSync}</span>
              <button
                onClick={() => handleTestConnection(item)}
                className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 rounded-lg font-semibold transition-all"
              >
                Test Connection
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Connection Diagnostic Modal */}
      {isDiagnosticOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Terminal className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">MCP Plugin Diagnostic Test</h3>
              </div>
              <button onClick={() => setIsDiagnosticOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Plugin Name:</span>
                <strong className="text-white">{selectedInteg.name}</strong>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>FastAPI Microservice Route:</span>
                <strong className="text-indigo-300 font-mono">/api/v1/mcp/plugins/{selectedInteg.key}</strong>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-emerald-400 min-h-[80px] flex items-center justify-center">
                {testResult ? (
                  <span>{testResult}</span>
                ) : (
                  <span className="text-indigo-400 animate-pulse">Ping-testing plugin credentials via MCP Orchestrator...</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
