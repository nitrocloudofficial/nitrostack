'use client';

import React, { useEffect, useState } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import { executeGatewayTool } from '../../utils/gatewayClient';
import { StatusBadge } from '../../components/StatusBadge';
import { ChainHash } from '../../components/ChainHash';
import { Activity, Shield, RefreshCw } from 'lucide-react';

interface FeedItem {
  index: number;
  timestamp: string;
  agentId: string;
  serverName: string;
  toolName: string;
  action: string;
  status: string;
  details: string;
  hash: string;
  prevHash: string;
}

export default function LiveFeedWidget() {
  const { isReady, getToolOutput, callTool } = useWidgetSDK();
  const initialData = getToolOutput<{ entries: FeedItem[] }>();
  const [entries, setEntries] = useState<FeedItem[]>(initialData?.entries || []);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchLatest = async () => {
    setIsRefreshing(true);
    try {
      const res = (await executeGatewayTool('query_ledger', { limit: 25 }, callTool, isReady)) as { entries: FeedItem[] };
      if (res?.entries) {
        setEntries(res.entries);
      }
    } catch (e) {
      console.error('Failed to fetch live feed:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (initialData?.entries) {
      setEntries(initialData.entries);
    }
  }, [initialData]);

  // Auto poll every 3 seconds for live streaming vibe
  useEffect(() => {
    fetchLatest();
    const interval = setInterval(fetchLatest, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-sky-400" />
          <h2 className="text-lg font-bold text-slate-100 tracking-tight">Sentinel Gateway — Real-Time Activity Feed</h2>
        </div>
        <button
          onClick={fetchLatest}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-sky-950/60 border border-sky-500/30 text-sky-300 hover:bg-sky-900/50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh Feed
        </button>
      </div>

      {/* Feed list */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
        {entries.length === 0 ? (
          <div className="text-center py-10 text-slate-500 glass-panel">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-40 animate-pulse" />
            <p className="text-sm">No activity recorded yet. Click "Load Demo Data" or stage an attack!</p>
          </div>
        ) : (
          entries.slice().reverse().map((entry, idx) => (
            <div
              key={entry.hash || idx}
              className={`p-3.5 glass-panel transition-all hover:border-sky-500/40 flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                entry.status === 'BLOCKED' ? 'border-l-4 border-l-rose-500 bg-rose-950/20' : ''
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge status={entry.status} />
                  <span className="font-mono text-xs text-sky-300 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
                    {entry.agentId}
                  </span>
                  <span className="text-slate-400 text-xs">→</span>
                  <span className="font-mono text-xs text-slate-300">
                    {entry.serverName}/{entry.toolName}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-sans leading-relaxed">{entry.details}</p>
              </div>

              <div className="flex md:flex-col items-end justify-between gap-1 text-[11px] text-slate-400 font-mono">
                <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                <ChainHash hash={entry.hash} label="Hash" truncateLength={8} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
