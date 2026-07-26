'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Play, Pause, RotateCcw, ChevronRight, Download, AlertOctagon, Check, Clock, FileSearch } from 'lucide-react';
import { useAegis } from '../../context/AegisContext';

interface LogEntry {
  id: string;
  ts: string;
  level: 'CRITICAL' | 'WARN' | 'INFO';
  source: string;
  msg: string;
}

const SEED_LOGS: LogEntry[] = [
  { id: 'L001', ts: '14:32:01.042', level: 'CRITICAL', source: 'TELECOM_NODE_04', msg: 'SIP trunk spoofing detected — Caller ID +91-11-23012345 routed via Cambodia AS13824' },
  { id: 'L002', ts: '14:32:00.891', level: 'CRITICAL', source: 'VOICE_SHIELD_ML', msg: 'AI synthetic voice — confidence 0.962. Formant F2 phase mismatch. Micro-tremor absent.' },
  { id: 'L003', ts: '14:31:58.410', level: 'WARN',     source: 'FINANCIAL_GRAPH', msg: 'Destination SBI-MULE-4482: 14 transfers cleared in 120 min. Zero-balance passthrough 100%.' },
  { id: 'L004', ts: '14:31:55.120', level: 'INFO',     source: 'ZK_VERIFIER_01',  msg: 'Zero-Knowledge proof verified — telemetry hash 0x7f83a21…904b. Clean execution.' },
  { id: 'L005', ts: '14:31:50.003', level: 'INFO',     source: 'NEFT_GATEWAY',    msg: 'Batch CLR-004 cleared ₹ 25,000. Risk Score: 12 (LOW).' },
];

const QUEUE = [
  { id: 'TXN-998822', account: 'HDFC-****4521', amount: '₹ 50,00,000', risk: 'CRITICAL', score: 94,  status: 'FLAGGED',    ts: '14:28' },
  { id: 'TXN-884210', account: 'ICICI-****9921', amount: '₹ 15,00,000', risk: 'HIGH',     score: 78,  status: 'IN_REVIEW',  ts: '14:24' },
  { id: 'TXN-773199', account: 'SBI-****8832',   amount: '₹ 2,50,000',  risk: 'LOW',      score: 12,  status: 'CLEARED',    ts: '14:22' },
  { id: 'TXN-662011', account: 'AXIS-****6677',  amount: '₹ 45,000',    risk: 'LOW',      score: 8,   status: 'CLEARED',    ts: '14:19' },
  { id: 'TXN-551900', account: 'KOTAK-****3344', amount: '₹ 8,20,000',  risk: 'MEDIUM',   score: 42,  status: 'MONITORING', ts: '14:17' },
];

const levelColors: Record<string, string> = {
  CRITICAL: 'bg-red-500/10 border-red-500/25 text-red-400',
  WARN:     'bg-amber-500/10 border-amber-500/25 text-amber-400',
  INFO:     'bg-white/4 border-white/8 text-gray-400',
};

const riskBadge: Record<string, string> = {
  CRITICAL: 'badge-critical',
  HIGH:     'badge-warning',
  MEDIUM:   'badge-info',
  LOW:      'badge-success',
};

export const LiveMonitoringView: React.FC = () => {
  const { setActivePage, selectedTxnId, setSelectedTxnId, triggerExportData, monitoringPaused, setMonitoringPaused } = useAegis();
  const [logs, setLogs]         = useState<LogEntry[]>(SEED_LOGS);
  const streaming = !monitoringPaused;

  const srcs = ['TELECOM_INSPECT', 'VOICE_SHIELD_V4', 'MULE_VELOCITY', 'ZK_PROVER_02', 'FIP_GATEWAY'];
  const msgs: Record<string, string> = {
    CRITICAL: 'STIR/SHAKEN handshake failed — high-coercion VoIP vector active.',
    WARN:     'Rapid outbound velocity detected on HDFC ATM cluster MUM-991.',
    INFO:     'Routine ZK telemetry heartbeat — all 6 nodes responding.',
  };

  useEffect(() => {
    if (!streaming) return;
    const id = setInterval(() => {
      const lvls: LogEntry['level'][] = ['INFO', 'INFO', 'WARN', 'CRITICAL'];
      const lvl  = lvls[Math.floor(Math.random() * lvls.length)];
      const now  = new Date();
      const ts   = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}.${Math.floor(Math.random()*900+100)}`;
      setLogs(prev => [
        { id: `L${Date.now()}`, ts, level: lvl, source: srcs[Math.floor(Math.random()*srcs.length)], msg: msgs[lvl] },
        ...prev.slice(0, 29),
      ]);
    }, 3000);
    return () => clearInterval(id);
  }, [streaming]);

  const selectedTxn = QUEUE.find(t => t.id === selectedTxnId) || QUEUE[0];

  return (
    <div className="page-enter max-w-7xl mx-auto space-y-6 pb-16">

      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-cinzel font-bold text-white">Live Monitoring</h1>
          <p className="text-sm text-gray-500">SOC real-time telemetry · Threat Fusion Engine</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => triggerExportData('csv', 'transactions')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono-ui font-bold bg-[#141414] border border-white/10 hover:border-[#D4AF37]/30 text-gray-300 transition-all"
          >
            <Download className="w-3.5 h-3.5" /> EXPORT QUEUE
          </button>

          <button
            onClick={() => setMonitoringPaused(!monitoringPaused)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono-ui font-bold border transition-all ${
              streaming
                ? 'bg-[#00C853]/10 border-[#00C853]/25 text-[#00C853]'
                : 'bg-red-950/40 border-red-500/30 text-red-400'
            }`}
          >
            {streaming ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {streaming ? 'STREAMING' : 'PAUSED'}
          </button>
          <button
            onClick={() => setLogs(SEED_LOGS)}
            title="Reset Telemetry Logs"
            className="p-2 rounded-xl bg-[#141414] border border-white/8 text-gray-500 hover:text-[#D4AF37] transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Left: Transaction Queue */}
        <div className="lg:col-span-2 space-y-3">
          <div className="text-xs font-mono-ui text-gray-500 uppercase tracking-wider px-1 flex items-center justify-between">
            <span>Transaction Queue</span>
            <span className="badge-gold">{QUEUE.length} IN FLIGHT</span>
          </div>
          <div className="space-y-2.5">
            {QUEUE.map((txn) => {
              const isSelected = selectedTxn.id === txn.id;
              return (
                <motion.button
                  key={txn.id}
                  whileHover={{ y: -1 }}
                  onClick={() => setSelectedTxnId(txn.id)}
                  className={`w-full text-left p-5 rounded-2xl border transition-all ${
                    isSelected
                      ? 'bg-[#141414] border-[#D4AF37]/35 shadow-lg'
                      : txn.risk === 'CRITICAL'
                      ? 'bg-[#141414]/70 border-red-500/20 hover:border-red-500/35'
                      : 'bg-[#141414]/70 border-[#D4AF37]/10 hover:border-[#D4AF37]/22'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-[10px] font-mono-ui text-gray-500">{txn.id}</span>
                    <span className={riskBadge[txn.risk] + ' rounded-full px-2 py-0.5 text-[9px] font-bold font-mono-ui border'}>
                      {txn.risk} · {txn.score}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-gray-200">{txn.account}</div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs font-mono-ui text-[#D4AF37] font-bold">{txn.amount}</span>
                    <span className="text-[10px] text-gray-500 font-mono-ui">{txn.ts}</span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Right: Live Console + Preview */}
        <div className="lg:col-span-3 space-y-5">
          {/* Selected investigation preview */}
          <div className="card p-6 border-[#D4AF37]/20 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-mono-ui text-gray-500 uppercase tracking-wider">Selected Transaction</div>
              <span className={riskBadge[selectedTxn.risk] + ' rounded-full px-2.5 py-0.5 text-[9px] font-bold font-mono-ui border'}>
                {selectedTxn.risk}
              </span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-white">{selectedTxn.account}</div>
                <div className="text-2xl font-bold font-mono-ui text-[#D4AF37] mt-1">{selectedTxn.amount}</div>
              </div>
              <button
                onClick={() => {
                  setSelectedTxnId(selectedTxn.id);
                  setActivePage('investigation');
                }}
                className="px-4 py-2 rounded-xl bg-[#141414] hover:bg-[#1A1A1A] border border-[#D4AF37]/25 hover:border-[#D4AF37]/45 text-[#D4AF37] text-xs font-mono-ui font-bold transition-all flex items-center gap-1.5 shrink-0"
              >
                Inspect Dossier <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3 text-[11px] font-mono-ui">
              <div className="p-3 rounded-xl bg-[#0B0B0B] border border-white/5">
                <div className="text-gray-500 mb-0.5">Case ID</div>
                <div className="text-gray-200">{selectedTxn.id}</div>
              </div>
              <div className="p-3 rounded-xl bg-[#0B0B0B] border border-white/5">
                <div className="text-gray-500 mb-0.5">Risk Score</div>
                <div className={selectedTxn.score >= 80 ? 'text-red-400 font-bold' : 'text-amber-400'}>{selectedTxn.score} / 100</div>
              </div>
              <div className="p-3 rounded-xl bg-[#0B0B0B] border border-white/5">
                <div className="text-gray-500 mb-0.5">Status</div>
                <div className="text-gray-200">{selectedTxn.status}</div>
              </div>
            </div>
          </div>

          {/* Live Telemetry Console */}
          <div className="card p-5 border-[#D4AF37]/12 h-80 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
              <div className="flex items-center gap-2 text-xs font-mono-ui text-gray-400">
                <Radio className="w-3.5 h-3.5 text-[#D4AF37]" /> TELEMETRY STREAM
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => triggerExportData('csv', 'telemetry')}
                  className="text-[10px] font-mono-ui text-gray-400 hover:text-[#D4AF37] flex items-center gap-1"
                >
                  <Download className="w-3 h-3" /> Export Logs
                </button>
                <div className="flex items-center gap-1.5 text-[10px] font-mono-ui text-[#00C853]">
                  <span className="status-dot-live" style={{ width: 6, height: 6 }} />
                  LIVE
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <AnimatePresence initial={false}>
                {logs.map((log) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-[10px] font-mono-ui ${levelColors[log.level]}`}
                  >
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold shrink-0 ${
                      log.level === 'CRITICAL' ? 'bg-red-500 text-black' :
                      log.level === 'WARN'     ? 'bg-amber-400 text-black' :
                                                 'bg-white/10 text-white'
                    }`}>
                      {log.level}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between gap-2 mb-0.5">
                        <span className="text-[#D4AF37]/80 truncate">{log.source}</span>
                        <span className="text-gray-600 shrink-0">{log.ts}</span>
                      </div>
                      <p className="text-[11px] font-sans text-inherit leading-relaxed">{log.msg}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
