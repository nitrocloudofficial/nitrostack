'use client';

import React, { useEffect, useState } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import { executeGatewayTool } from '../../utils/gatewayClient';
import { Network, Server, Wrench, Shield, Bot } from 'lucide-react';

interface ServerInfo {
  name: string;
  url: string;
  status: string;
  toolCount: number;
  tools: string[];
}

export default function ServerTopologyWidget() {
  const { isReady, getToolOutput, callTool } = useWidgetSDK();
  const initialData = getToolOutput<{ servers: ServerInfo[] }>();
  const [servers, setServers] = useState<ServerInfo[]>(initialData?.servers || []);

  const fetchServers = async () => {
    try {
      const res = (await executeGatewayTool('list_servers', {}, callTool, isReady)) as { servers: ServerInfo[] };
      if (res?.servers) {
        setServers(res.servers);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (initialData?.servers) {
      setServers(initialData.servers);
    }
  }, [initialData]);

  useEffect(() => {
    fetchServers();
  }, []);

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Network className="w-5 h-5 text-sky-400" />
          <h2 className="text-lg font-bold text-slate-100">Sentinel Zero-Trust Gateway Topology</h2>
        </div>
        <span className="text-xs text-sky-400 font-mono bg-sky-950/60 px-2.5 py-1 rounded border border-sky-500/30">
          {servers.length} Servers Active
        </span>
      </div>

      {/* Network Graph Diagram */}
      <div className="glass-panel p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden min-h-[300px]">
        {/* Left: Agents */}
        <div className="space-y-3 z-10 w-full md:w-1/4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Agent Callers</div>
          {['sales-bot', 'data-analyst', 'rogue-agent'].map((agent) => (
            <div
              key={agent}
              className={`p-3 rounded-lg border flex items-center gap-2 text-xs font-mono ${
                agent === 'rogue-agent'
                  ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  : 'bg-slate-900/80 border-slate-700 text-slate-200'
              }`}
            >
              <Bot className="w-4 h-4 text-sky-400" />
              <span>{agent}</span>
            </div>
          ))}
        </div>

        {/* Center: Sentinel Gateway */}
        <div className="z-10 flex flex-col items-center justify-center p-6 bg-sky-950/60 border-2 border-sky-400 rounded-xl glow-cyan text-center w-full md:w-1/3">
          <Shield className="w-10 h-10 text-sky-400 animate-pulse-slow mb-2" />
          <h3 className="text-sm font-bold text-slate-100">SENTINEL GATEWAY</h3>
          <p className="text-[11px] text-sky-300 mt-1">Zero-Trust Interceptor & Fingerprint Engine</p>
        </div>

        {/* Right: MCP Servers */}
        <div className="space-y-3 z-10 w-full md:w-1/3">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Internal MCP Servers</div>
          {servers.length === 0 ? (
            <div className="text-xs text-slate-500 italic p-3 border border-dashed border-slate-800 rounded">
              No servers registered. Click "Load Demo Data" at top of page.
            </div>
          ) : (
            servers.map((s) => (
              <div key={s.name} className="p-3 bg-slate-900/90 border border-slate-800 rounded-lg space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-200">
                    <Server className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{s.name}</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-500/30">
                    {s.tools.length} Tools
                  </span>
                </div>
                <div className="flex items-center gap-1 flex-wrap pt-1">
                  {s.tools.map((tool) => (
                    <span key={tool} className="text-[10px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <Wrench className="w-2.5 h-2.5 text-sky-400" />
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
