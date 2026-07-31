'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Cpu,
  Server,
  CheckCircle2,
  Zap,
  HardDrive,
  ShieldCheck,
  Globe
} from 'lucide-react';

const NODES_STATUS = [
  { id: 'ZK-NODE-01', name: 'Zero-Knowledge Telemetry Prover 1', status: 'HEALTHY', latency: '12ms', cpu: '18%', memory: '2.4 GB' },
  { id: 'ZK-NODE-02', name: 'Zero-Knowledge Telemetry Prover 2', status: 'HEALTHY', latency: '14ms', cpu: '22%', memory: '2.8 GB' },
  { id: 'VOICE-ML-01', name: 'VoiceGuard Neural Biometrics Engine', status: 'HEALTHY', latency: '84ms', cpu: '45%', memory: '8.1 GB' },
  { id: 'GRAPH-MULE-01', name: 'Bank Mule Velocity Graph Cluster', status: 'HEALTHY', latency: '24ms', cpu: '31%', memory: '4.2 GB' },
  { id: 'MCP-SERVER-01', name: 'NitroStack MCP Stdio/HTTP Server', status: 'HEALTHY', latency: '4ms', cpu: '8%', memory: '1.1 GB' },
  { id: 'HITL-WIDGET-01', name: 'Fraud Officer Dashboard SDK', status: 'HEALTHY', latency: '2ms', cpu: '5%', memory: '450 MB' },
];

export const SystemHealthView: React.FC = () => {
  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-[#141414] via-[#101010] to-[#0A0A0A] border border-[#D4AF37]/25 shadow-2xl flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold font-cinzel text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            System Health & Infrastructure Cluster
          </h2>
          <p className="text-xs text-gray-400 font-mono">
            Zero-Knowledge Verifier Nodes • NitroStack MCP Transport • VoiceShield ML Status
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-500/40 font-mono text-xs font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          SYSTEM UPTIME: 99.998%
        </div>
      </div>

      {/* Top 4 Performance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#0F0F0F] border border-[#D4AF37]/20">
          <div className="text-xs font-mono text-gray-400 uppercase">Average Latency</div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">14 ms</div>
          <div className="text-[10px] text-gray-500 mt-1">Global ZK Network</div>
        </div>
        <div className="p-4 rounded-2xl bg-[#0F0F0F] border border-[#D4AF37]/20">
          <div className="text-xs font-mono text-gray-400 uppercase">ML Model Inference</div>
          <div className="text-2xl font-bold font-mono text-[#F2C14E] mt-1">84 ms</div>
          <div className="text-[10px] text-gray-500 mt-1">VoiceGuard Neural v4.2</div>
        </div>
        <div className="p-4 rounded-2xl bg-[#0F0F0F] border border-[#D4AF37]/20">
          <div className="text-xs font-mono text-gray-400 uppercase">MCP Transport</div>
          <div className="text-2xl font-bold font-mono text-[#4F8CFF] mt-1">DUAL (STDIO/HTTP)</div>
          <div className="text-[10px] text-gray-500 mt-1">NitroStack Engine</div>
        </div>
        <div className="p-4 rounded-2xl bg-[#0F0F0F] border border-[#D4AF37]/20">
          <div className="text-xs font-mono text-gray-400 uppercase">ZK Proof Verification</div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">100% VALIDATED</div>
          <div className="text-[10px] text-gray-500 mt-1">6 Nodes Active</div>
        </div>
      </div>

      {/* Node Table List */}
      <div className="p-6 rounded-2xl bg-[#090909] border border-[#D4AF37]/20 shadow-xl space-y-4">
        <h3 className="text-xs font-mono font-bold text-gray-200 uppercase tracking-wider">
          Active Cluster Services & Telemetry Nodes
        </h3>

        <div className="space-y-3 font-mono text-xs">
          {NODES_STATUS.map((node) => (
            <div
              key={node.id}
              className="p-4 rounded-xl bg-[#141414] border border-gray-800 flex items-center justify-between hover:border-[#D4AF37]/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-gray-100">{node.name}</div>
                  <div className="text-[10px] text-gray-400">{node.id}</div>
                </div>
              </div>

              <div className="flex items-center gap-8 text-right">
                <div>
                  <div className="text-gray-400 text-[10px]">LATENCY</div>
                  <div className="font-bold text-emerald-400">{node.latency}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-[10px]">CPU</div>
                  <div className="font-bold text-gray-200">{node.cpu}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-[10px]">RAM</div>
                  <div className="font-bold text-gray-200">{node.memory}</div>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-500/40 font-bold text-[10px]">
                  <CheckCircle2 className="w-3.5 h-3.5" /> HEALTHY
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
