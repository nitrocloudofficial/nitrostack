'use client';

import React, { useEffect, useState } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import { executeGatewayTool } from '../../utils/gatewayClient';
import { StatusBadge } from '../../components/StatusBadge';
import { ChainHash } from '../../components/ChainHash';
import { Database, ShieldCheck, AlertTriangle, RefreshCw } from 'lucide-react';

interface LedgerItem {
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

interface VerificationState {
  valid?: boolean;
  totalEntries?: number;
  message?: string;
  brokenAtIndex?: number;
}

export default function LedgerViewerWidget() {
  const { isReady, getToolOutput, callTool } = useWidgetSDK();
  const initialData = getToolOutput<{ entries: LedgerItem[] }>();
  const [entries, setEntries] = useState<LedgerItem[]>(initialData?.entries || []);
  const [verification, setVerification] = useState<VerificationState | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const fetchLedger = async () => {
    try {
      const res = (await executeGatewayTool('query_ledger', { limit: 50 }, callTool, isReady)) as { entries: LedgerItem[] };
      if (res?.entries) {
        setEntries(res.entries);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const verifyChain = async () => {
    setIsVerifying(true);
    try {
      const res = (await executeGatewayTool('verify_chain_integrity', {}, callTool, isReady)) as VerificationState;
      if (res) {
        setVerification(res);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    if (initialData?.entries) {
      setEntries(initialData.entries);
    }
  }, [initialData]);

  useEffect(() => {
    fetchLedger();
    verifyChain();

    const handleReset = () => {
      fetchLedger();
      verifyChain();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('sentinel:reset', handleReset);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('sentinel:reset', handleReset);
      }
    };
  }, []);

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto">
      {/* Header & Verification Bar */}
      <div className="glass-panel p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-sky-400" />
            <div>
              <h2 className="text-base font-bold text-slate-100">Cryptographic Provenance Ledger</h2>
              <p className="text-xs text-slate-400">Append-only SHA-256 hash chain auditing every tool call</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchLedger}
              className="p-2 text-slate-400 hover:text-slate-200 transition-colors"
              title="Refresh ledger"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={verifyChain}
              disabled={isVerifying}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 flex items-center gap-1.5 transition-colors shadow-lg shadow-sky-500/20 disabled:opacity-50"
            >
              <ShieldCheck className={`w-4 h-4 ${isVerifying ? 'animate-spin' : ''}`} />
              Verify Chain Integrity
            </button>
          </div>
        </div>

        {/* Verification Status Alert */}
        {verification && (
          <div
            className={`p-3 rounded-lg border text-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-2 ${
              verification.valid
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-950/60 border-rose-500/50 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {verification.valid ? (
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{verification.message}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!verification.valid && (
                <button
                  onClick={async () => {
                    await executeGatewayTool('reset_demo', {}, callTool, isReady);
                    await executeGatewayTool('setup_demo', {}, callTool, isReady);
                    await fetchLedger();
                    await verifyChain();
                  }}
                  className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-bold rounded shadow transition-all flex items-center gap-1"
                >
                  🔧 Repair & Clear Tamper (Restore Green)
                </button>
              )}
              <span className="font-mono text-[11px] opacity-80">
                Chain length: {verification.totalEntries} entries
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Ledger Table */}
      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 font-mono text-[11px]">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Agent</th>
                <th className="p-3">Target Tool</th>
                <th className="p-3">Status</th>
                <th className="p-3">Hash Link (prev $\rightarrow$ curr)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500">
                    No ledger entries available. Click "Load Demo Data" at the top!
                  </td>
                </tr>
              ) : (
                entries.map((entry) => {
                  const isTampered = verification?.brokenAtIndex === entry.index;
                  const isBlocked = entry.status === 'BLOCKED' || entry.status === 'DENIED' || entry.status === 'TAMPERED';
                  return (
                    <tr
                      key={entry.hash || entry.index}
                      className={`transition-colors ${
                        isTampered
                          ? 'bg-rose-950/80 border-2 border-rose-500 animate-pulse'
                          : isBlocked
                          ? 'bg-rose-950/30 border-l-4 border-l-rose-500 hover:bg-rose-900/40'
                          : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="p-3 font-mono text-slate-400">#{entry.index}</td>
                      <td className="p-3 font-mono text-slate-400">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="p-3 font-semibold text-sky-300">{entry.agentId}</td>
                      <td className="p-3">
                        <span className="text-slate-400">{entry.serverName}/</span>
                        <span className="text-slate-200 font-semibold">{entry.toolName}</span>
                      </td>
                      <td className="p-3">
                        <StatusBadge status={isTampered ? 'TAMPERED' : entry.status} />
                      </td>
                      <td className="p-3 space-x-1 font-mono">
                        <ChainHash hash={entry.prevHash} label="Prev" truncateLength={6} />
                        <span className="text-slate-600">$\rightarrow$</span>
                        <ChainHash hash={entry.hash} label="Hash" truncateLength={6} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
