import React, { useState, useEffect } from 'react';
import { Terminal, RefreshCw, Activity, Server, CheckCircle2, AlertTriangle, X, ChevronUp, ChevronDown } from 'lucide-react';
import { apiService, DebugInfo } from '../../services/apiService';

export const DeveloperDebugPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [debug, setDebug] = useState<DebugInfo>(apiService.debugInfo);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const unsubscribe = apiService.subscribeDebug((info) => {
      setDebug(info);
    });
    return unsubscribe;
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await apiService.getLatestRate('USD', 'INR');
    await apiService.checkHealth();
    setTimeout(() => setIsRefreshing(false), 400);
  };

  const isOnline = debug.httpStatusCode === 200;

  return (
    <div className="fixed bottom-4 left-4 z-50 font-sans select-none">
      {/* Floating Toggle Pill */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-full border shadow-xl backdrop-blur-md transition-all duration-300 hover:scale-105 ${
            isOnline
              ? 'bg-slate-900/90 text-emerald-400 border-emerald-500/40 shadow-emerald-500/10'
              : 'bg-slate-900/90 text-amber-400 border-amber-500/40 shadow-amber-500/10'
          }`}
        >
          <Activity className={`w-3.5 h-3.5 ${isOnline ? 'animate-pulse text-emerald-400' : 'text-amber-400'}`} />
          <span className="text-[11px] font-mono font-bold tracking-tight">
            API Debugger · {debug.latencyMs}ms
          </span>
          <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase ${
            debug.cacheStatus === 'HIT' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
          }`}>
            {debug.cacheStatus}
          </span>
          <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
        </button>
      )}

      {/* Expanded Debug Panel */}
      {isOpen && (
        <div className="w-[380px] sm:w-[440px] rounded-2xl bg-slate-950 border border-slate-800 text-slate-100 shadow-2xl overflow-hidden backdrop-blur-xl animate-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="font-mono font-bold text-xs uppercase tracking-wider">
                Developer Live API Debugger
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title="Trigger API Refresh"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body stats */}
          <div className="p-4 space-y-3 font-mono text-xs">
            {/* Status & Latency row */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Backend Status</span>
                <span className={`font-bold flex items-center gap-1.5 ${isOnline ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isOnline ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  {debug.backendStatus}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Response Latency</span>
                <span className="font-bold text-teal-400 flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5" />
                  {debug.latencyMs} ms
                </span>
              </div>
            </div>

            {/* URL & Source row */}
            <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500">API Endpoint:</span>
                <span className="text-blue-400 truncate max-w-[240px] font-mono">{debug.apiUrl}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500">Data Source:</span>
                <span className="text-emerald-400 font-bold">{debug.dataSource}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500">Cache Status:</span>
                <span className={`font-bold ${debug.cacheStatus === 'HIT' ? 'text-blue-400' : debug.cacheStatus === 'STALE' ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {debug.cacheStatus} {debug.cacheStatus === 'HIT' ? '(30s TTL)' : ''}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500">Last Refreshed:</span>
                <span className="text-slate-300">{debug.lastRefresh}</span>
              </div>
            </div>

            {/* Raw JSON Payload */}
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">HTTP Response Payload</span>
              <pre className="p-2.5 rounded-xl bg-slate-900 text-[10px] text-slate-300 border border-slate-800 overflow-x-auto max-h-[140px] no-scrollbar">
                {JSON.stringify(debug.responsePayload || { status: 'waiting_for_first_query' }, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
