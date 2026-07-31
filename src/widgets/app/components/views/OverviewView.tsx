'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, AlertOctagon, Clock, ChevronRight, PhoneCall, Mic, Building2, Zap, Download } from 'lucide-react';
import { useAegis } from '../../context/AegisContext';

interface OverviewViewProps {
  onGoToInvestigation: () => void;
  onSimulateScam: () => void;
}

import { Variants } from 'framer-motion';

const cardVariants: Variants = {
  hidden:  { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4, ease: [0.16,1,0.3,1] as const } }),
};

export const OverviewView: React.FC<OverviewViewProps> = ({ onGoToInvestigation, onSimulateScam }) => {
  const { investigation, simulateScam, triggerExportData, monitoringPaused } = useAegis();

  return (
    <div className="page-enter max-w-6xl mx-auto space-y-8 pb-16">

      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-cinzel font-bold text-white tracking-wide">Executive Overview</h1>
          <p className="text-sm text-gray-500">Real-time fraud intelligence summary · Zero-Knowledge Threat Fusion</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => triggerExportData('pdf', 'investigation')}
            className="px-4 py-2 rounded-xl bg-[#141414] border border-white/10 hover:border-[#D4AF37]/30 text-gray-300 text-xs font-mono-ui font-bold transition-all flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5" /> Export PDF Summary
          </button>
        </div>
      </div>

      {/* Status Banner */}
      <motion.div
        custom={0} variants={cardVariants} initial="hidden" animate="visible"
        className={`card p-6 flex items-center justify-between gap-6 transition-all duration-300 ${
          monitoringPaused ? 'border-red-500/30' : ''
        }`}
      >
        <div className="flex items-center gap-4">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300 ${
            monitoringPaused
              ? 'bg-red-500/10 border border-red-500/25'
              : 'bg-[#00C853]/10 border border-[#00C853]/25'
          }`}>
            <ShieldCheck className={`w-5 h-5 ${monitoringPaused ? 'text-red-400' : 'text-[#00C853]'}`} />
          </div>
          <div>
            <div className={`text-xs font-mono-ui font-bold uppercase tracking-widest transition-colors duration-300 ${
              monitoringPaused ? 'text-red-400' : 'text-[#00C853]'
            }`}>
              {monitoringPaused ? 'Threat Fusion On Hold' : 'Threat Fusion Active'}
            </div>
            <div className="text-lg font-semibold text-white mt-0.5">
              {monitoringPaused ? 'SOC Monitoring Paused' : 'All SOC Systems Operational'}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {monitoringPaused
                ? 'Monitoring paused by officer · Resume from Live Monitoring page'
                : '6 / 6 Zero-Knowledge Verifier Nodes Online · MCP Server Running'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`w-2 h-2 rounded-full transition-all duration-300 ${
            monitoringPaused
              ? 'bg-red-500 shadow-[0_0_8px_#FF4D4F]'
              : 'bg-[#00C853] shadow-[0_0_6px_#00C853]'
          }`} style={monitoringPaused ? {} : { animation: 'pulse 2s infinite' }} />
          <span className={`text-xs font-mono-ui ${monitoringPaused ? 'text-red-400 font-bold' : 'text-gray-400'}`}>
            {monitoringPaused ? 'ON HOLD' : 'Monitoring'}
          </span>
        </div>
      </motion.div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          {
            label: 'Current Threat Level',
            value: `${investigation.threatScore} / 100`,
            sub: 'Digital Arrest Scam Detected',
            color: '#FF4D4F',
            bg: 'border-red-500/25',
            icon: AlertOctagon,
            iconColor: 'text-red-500',
            iconBg: 'bg-red-500/10 border-red-500/25',
          },
          {
            label: 'Active Investigations',
            value: '1',
            sub: 'Awaiting Officer Decision',
            color: '#D4AF37',
            bg: 'border-[#D4AF37]/20',
            icon: Clock,
            iconColor: 'text-[#D4AF37]',
            iconBg: 'bg-[#D4AF37]/10 border-[#D4AF37]/25',
          },
          {
            label: 'System Uptime',
            value: '99.9%',
            sub: 'VoiceGuard · MCP · ZK Prover',
            color: '#00C853',
            bg: 'border-[#00C853]/20',
            icon: ShieldCheck,
            iconColor: 'text-[#00C853]',
            iconBg: 'bg-[#00C853]/10 border-[#00C853]/25',
          },
        ].map((item, i) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.label}
              custom={i + 1} variants={cardVariants} initial="hidden" animate="visible"
              className={`card p-7 border ${item.bg}`}
            >
              <div className="flex items-start justify-between">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${item.iconBg}`}>
                  <Icon className={`w-4.5 h-4.5 ${item.iconColor}`} style={{ width: 18, height: 18 }} />
                </div>
                <span className="text-[10px] font-mono-ui text-gray-600 uppercase tracking-wider">{item.label}</span>
              </div>
              <div className="mt-5">
                <div className="text-2xl font-bold font-mono-ui" style={{ color: item.color }}>{item.value}</div>
                <div className="text-xs text-gray-500 mt-1">{item.sub}</div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Primary Investigation Card */}
      <motion.div
        custom={4} variants={cardVariants} initial="hidden" animate="visible"
        className="card p-8 border border-[#D4AF37]/20"
      >
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="badge-critical">Primary Investigation</span>
              <span className="text-[10px] font-mono-ui text-gray-500">{investigation.id}</span>
            </div>
            <h2 className="text-xl font-cinzel font-bold text-white">
              {investigation.caseTitle}
            </h2>
            <p className="text-sm text-gray-500 mt-2">
              Target: <span className="text-gray-300">{investigation.targetAccount} ({investigation.customerName})</span> ·
              Attempted Transfer: <span className="text-red-400 font-mono-ui font-bold"> {investigation.amount}</span>
            </p>
          </div>
          <button
            onClick={onGoToInvestigation}
            className="px-5 py-2.5 rounded-xl bg-[#141414] hover:bg-[#1A1A1A] border border-[#D4AF37]/25 hover:border-[#D4AF37]/45 text-[#D4AF37] text-xs font-mono-ui font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            View Full Story <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 3-Column Evidence Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              icon: PhoneCall, color: 'text-[#D4AF37]', border: 'border-[#D4AF37]/15',
              title: 'Telecom Intelligence',
              rows: [
                ['STIR/SHAKEN', investigation.telecom.stirShaken.includes('FAILED') ? 'FAILED' : 'VERIFIED', 'text-red-400'],
                ['True Origin',  investigation.telecom.origin.split(' ')[0], 'text-gray-200'],
                ['Call Duration', investigation.telecom.duration.split(' ')[0] + ' ' + investigation.telecom.duration.split(' ')[1], 'text-amber-400'],
              ],
            },
            {
              icon: Mic, color: 'text-[#5EA2FF]', border: 'border-[#5EA2FF]/15',
              title: 'Voice Biometrics',
              rows: [
                ['AI Probability',  investigation.voice.aiConfidence.split(' ')[0], 'text-red-400'],
                ['Model',          investigation.voice.model.split(' ')[0], 'text-gray-200'],
                ['Micro-Tremor',   investigation.voice.microTremor.split(' ')[0], 'text-red-400'],
              ],
            },
            {
              icon: Building2, color: 'text-[#00C853]', border: 'border-[#00C853]/15',
              title: 'Bank Mule Network',
              rows: [
                ['Destination',  investigation.bank.destinationAccount.split('-')[0] + '-' + investigation.bank.destinationAccount.split('-')[1], 'text-gray-200'],
                ['Account Age',  investigation.bank.accountAge, 'text-amber-400'],
                ['24h Velocity', investigation.bank.velocity24h.split(' ')[0] + ' transfers', 'text-red-400'],
              ],
            },
          ].map((col) => {
            const Icon = col.icon;
            return (
              <div key={col.title} className={`p-5 rounded-2xl bg-[#0B0B0B] border ${col.border}`}>
                <div className={`flex items-center gap-2 text-xs font-semibold mb-4 ${col.color}`}>
                  <Icon className="w-3.5 h-3.5" /> {col.title}
                </div>
                <div className="space-y-2.5">
                  {col.rows.map(([k, v, cls]) => (
                    <div key={k} className="flex justify-between text-[11px] font-mono-ui">
                      <span className="text-gray-500">{k}</span>
                      <span className={cls}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

    </div>
  );
};
