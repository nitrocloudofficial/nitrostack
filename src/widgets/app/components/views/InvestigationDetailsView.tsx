'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PhoneCall, Mic, Building2, Lock, FileText, ArrowDown, ChevronUp, ChevronDown, CheckCircle, Download } from 'lucide-react';
import { useAegis } from '../../context/AegisContext';
import { ReportModal } from '../ReportModal';

interface InvestigationDetailsViewProps {
  onFreezeApproved: () => void;
}

type StageKey = 'telecom' | 'voice' | 'bank';

import { Variants } from 'framer-motion';

const stepVariants: Variants = {
  hidden:  { opacity: 0, x: -12 },
  visible: (i: number) => ({ opacity: 1, x: 0, transition: { delay: i * 0.12, duration: 0.38, ease: [0.16,1,0.3,1] as const } }),
};

export const InvestigationDetailsView: React.FC<InvestigationDetailsViewProps> = ({ onFreezeApproved }) => {
  const { investigation, freezeState, handleFreezeTransaction, triggerGenerateReport, triggerExportData, settings } = useAegis();
  const [open, setOpen]   = useState<Record<StageKey, boolean>>({ telecom: true, voice: true, bank: true });
  const [activeStep, setActiveStep] = useState(0);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const shouldAutoFreeze = settings.autoFreeze || !settings.hitlRequired;

  useEffect(() => {
    const timers = [1, 2, 3, 4].map((step, i) =>
      setTimeout(() => setActiveStep(step), 400 + i * 500)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const toggle = (key: StageKey) => setOpen(prev => ({ ...prev, [key]: !prev[key] }));

  const handleFreeze = () => {
    handleFreezeTransaction();
    setTimeout(() => {
      onFreezeApproved();
    }, 1200);
  };

  const STAGES = [
    {
      num: 1,
      title: 'Transaction Intercepted',
      sub: 'RTGS Fast-Clearance Queue · Pending Officer Approval',
      color: 'border-[#D4AF37]/25',
      numColor: 'border-[#D4AF37] text-[#D4AF37]',
      body: (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[11px] font-mono-ui text-gray-400">
          {[['Source Account', investigation.targetAccount], ['Target Account', investigation.bank.destinationAccount], ['Transfer Amount', investigation.amount], ['Transaction Type', 'RTGS']].map(([k,v]) => (
            <div key={k} className="p-3 rounded-xl bg-[#0B0B0B] border border-white/6">
              <div className="text-gray-500 text-[9px] uppercase tracking-wider mb-1">{k}</div>
              <div className="text-gray-100 font-semibold">{v}</div>
            </div>
          ))}
        </div>
      ),
    },
    {
      num: 2,
      stageKey: 'telecom' as StageKey,
      title: 'Telecom Metadata Analysis',
      sub: 'STIR/SHAKEN · SIP Trunk Inspection · VoIP Origin Tracing',
      color: 'border-red-500/25',
      numColor: 'border-red-500 text-red-500',
      icon: <PhoneCall className="w-4 h-4 text-[#D4AF37]" />,
      iconLabel: 'Telecom Intelligence',
      iconColor: 'text-[#D4AF37]',
      body: (
        <div className="grid grid-cols-2 md:grid-cols-2 gap-4 text-[11px] font-mono-ui">
          <div className="p-4 rounded-xl bg-[#0B0B0B] border border-red-500/15 space-y-2">
            <div className="text-gray-500 text-[9px] uppercase tracking-wider">Incoming Caller ID</div>
            <div className="text-red-400 font-bold">{investigation.telecom.callerId}</div>
            <div className="text-[9px] text-amber-400">⚠ CLI MISMATCH — SPOOFED</div>
          </div>
          <div className="p-4 rounded-xl bg-[#0B0B0B] border border-red-500/15 space-y-2">
            <div className="text-gray-500 text-[9px] uppercase tracking-wider">True Origin Node</div>
            <div className="text-gray-100 font-semibold">{investigation.telecom.origin}</div>
            <div className="text-[9px] text-red-400">✗ STIR/SHAKEN HANDSHAKE FAILED</div>
          </div>
          <div className="p-4 rounded-xl bg-[#0B0B0B] border border-red-500/15 space-y-2">
            <div className="text-gray-500 text-[9px] uppercase tracking-wider">Call Duration</div>
            <div className="text-amber-400 font-bold">{investigation.telecom.duration}</div>
          </div>
          <div className="p-4 rounded-xl bg-[#0B0B0B] border border-red-500/15 space-y-2">
            <div className="text-gray-500 text-[9px] uppercase tracking-wider">Risk Indicator</div>
            <div className="text-red-400 font-bold">CRITICAL — {investigation.telecom.anomalies.length} anomalies flagged</div>
          </div>
        </div>
      ),
    },
    {
      num: 3,
      stageKey: 'voice' as StageKey,
      title: 'Voice Biometric Deepfake Analysis',
      sub: 'Neural acoustic model · VoiceGuard-v4.2 · Spectral signature verification',
      color: 'border-[#5EA2FF]/25',
      numColor: 'border-[#5EA2FF] text-[#5EA2FF]',
      icon: <Mic className="w-4 h-4 text-[#5EA2FF]" />,
      iconLabel: 'Voice Biometrics',
      iconColor: 'text-[#5EA2FF]',
      body: (
        <div className="grid grid-cols-2 gap-4 text-[11px] font-mono-ui">
          <div className="p-4 rounded-xl bg-[#0B0B0B] border border-[#5EA2FF]/15 space-y-2">
            <div className="text-gray-500 text-[9px] uppercase tracking-wider">AI Synthesis Probability</div>
            <div className="text-red-400 font-bold text-lg">{investigation.voice.aiConfidence}</div>
            <div className="text-[9px] text-gray-400">Model: {investigation.voice.model}</div>
          </div>
          <div className="p-4 rounded-xl bg-[#0B0B0B] border border-[#5EA2FF]/15 space-y-2">
            <div className="text-gray-500 text-[9px] uppercase tracking-wider">Spectral Anomalies</div>
            <div className="text-red-400 font-bold">{investigation.voice.formantStatus}</div>
            <div className="text-red-400 text-[10px]">Micro-Tremor: {investigation.voice.microTremor}</div>
            <div className="text-red-400 text-[10px]">Verdict: {investigation.voice.verdict}</div>
          </div>
        </div>
      ),
    },
    {
      num: 4,
      stageKey: 'bank' as StageKey,
      title: 'Bank Mule Network Analysis',
      sub: 'Account velocity graph · KYC verification · Multi-hop layering detection',
      color: 'border-[#00C853]/25',
      numColor: 'border-[#00C853] text-[#00C853]',
      icon: <Building2 className="w-4 h-4 text-[#00C853]" />,
      iconLabel: 'Bank Intelligence',
      iconColor: 'text-[#00C853]',
      body: (
        <div className="grid grid-cols-2 gap-4 text-[11px] font-mono-ui">
          <div className="p-4 rounded-xl bg-[#0B0B0B] border border-[#00C853]/15 space-y-2">
            <div className="text-gray-500 text-[9px] uppercase tracking-wider">Destination Account</div>
            <div className="text-gray-100 font-bold">{investigation.bank.destinationAccount}</div>
            <div className="text-amber-400 text-[10px]">Account Age: {investigation.bank.accountAge}</div>
            <div className="text-[10px] text-gray-400">KYC: {investigation.bank.kycStatus}</div>
          </div>
          <div className="p-4 rounded-xl bg-[#0B0B0B] border border-[#00C853]/15 space-y-2">
            <div className="text-gray-500 text-[9px] uppercase tracking-wider">Velocity (24h)</div>
            <div className="text-red-400 font-bold">{investigation.bank.velocity24h}</div>
            <div className="text-red-400 text-[10px]">Verdict: {investigation.bank.verdict}</div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="page-enter max-w-5xl mx-auto space-y-8 pb-16">

      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 p-8 card border-[#D4AF37]/20">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <span className="badge-critical rounded-full px-3 py-0.5">Case Dossier</span>
            <span className="text-[10px] font-mono-ui text-gray-500">{investigation.id}</span>
          </div>
          <h1 className="text-xl font-cinzel font-bold text-white">{investigation.caseTitle}</h1>
          <p className="text-xs text-gray-500 font-mono-ui">
            Target: <span className="text-gray-300">{investigation.targetAccount} ({investigation.customerName})</span> ·
            Attempted Transfer: <span className="text-red-400 font-bold"> {investigation.amount}</span>
          </p>
        </div>

        {/* Threat Score Gauge */}
        <div className="shrink-0 flex items-center gap-4 p-5 rounded-2xl bg-[#0B0B0B] border border-red-500/25">
          <div className="relative w-20 h-20">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" stroke="rgba(255,77,79,0.12)" strokeWidth="10" fill="none" />
              <circle
                cx="50" cy="50" r="40"
                stroke="#FF4D4F" strokeWidth="10" strokeLinecap="round" fill="none"
                strokeDasharray={251.2} strokeDashoffset={251.2 - (251.2 * investigation.threatScore) / 100}
                style={{ filter: 'drop-shadow(0 0 5px #FF4D4F)' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold font-mono-ui text-red-500 leading-none">{investigation.threatScore}</span>
              <span className="text-[8px] font-mono-ui text-gray-600 uppercase mt-0.5">score</span>
            </div>
          </div>
          <div>
            <div className="badge-critical mb-1">{investigation.severity}</div>
            <div className="text-[10px] font-mono-ui text-gray-500">ZK Fusion Verified</div>
          </div>
        </div>
      </div>

      {/* Vertical Timeline */}
      <div className="relative">
        <div className="absolute left-[19px] top-8 bottom-8 w-px bg-gradient-to-b from-[#D4AF37]/30 via-[#D4AF37]/10 to-transparent" />

        <div className="space-y-5">
          {STAGES.map((stage, i) => {
            const isVisible = activeStep >= i;
            const key = stage.stageKey;
            const isOpen = key ? open[key] : true;

            return (
              <motion.div
                key={stage.num}
                custom={i}
                variants={stepVariants}
                initial="hidden"
                animate={isVisible ? 'visible' : 'hidden'}
                className="flex gap-5"
              >
                <div className={`w-10 h-10 rounded-full border-2 ${stage.numColor} bg-[#0B0B0B] flex items-center justify-center text-xs font-bold font-mono-ui shrink-0 z-10`}>
                  {isVisible ? stage.num : '·'}
                </div>

                <div className={`flex-1 card border ${stage.color} overflow-hidden`}>
                  <div
                    className={`flex items-center justify-between p-5 ${key ? 'cursor-pointer hover:bg-white/2' : ''}`}
                    onClick={() => key && toggle(key)}
                  >
                    <div>
                      <div className="text-sm font-semibold text-gray-100">{stage.title}</div>
                      <div className="text-[11px] text-gray-500 mt-0.5">{stage.sub}</div>
                    </div>
                    {key && (
                      <button className="text-gray-500 hover:text-gray-300 transition-colors ml-4 shrink-0">
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    )}
                  </div>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 border-t border-white/5 pt-4">
                          {stage.body}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Decision Bar */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: activeStep >= 3 ? 1 : 0 }}
        transition={{ duration: 0.4 }}
        className="card p-7 border border-[#D4AF37]/22 flex flex-col md:flex-row items-center justify-between gap-6"
      >
        <div>
          <div className="text-xs font-mono-ui text-gray-500 mb-1">
            {freezeState === 'frozen' || (shouldAutoFreeze && investigation.status === 'FROZEN')
              ? 'STAGE 5 · AUTOMATED ENFORCEMENT EXECUTED'
              : 'STAGE 5 · OFFICER DECISION REQUIRED'}
          </div>
          <div className="text-sm text-gray-300">
            {freezeState === 'frozen' || (shouldAutoFreeze && investigation.status === 'FROZEN')
              ? 'Multi-hop accounts frozen automatically without HITL per enforcement rules. Incident dossier dispatched to MHA I4C.'
              : 'All three intelligence pillars confirm high-confidence Digital Arrest Scam. Human clearance required before funds release.'}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-[#141414] border border-white/10 text-gray-400 hover:text-white text-xs font-mono-ui hover:bg-[#1A1A1A] transition-all flex items-center gap-2"
          >
            <FileText className="w-3.5 h-3.5" /> Generate Report
          </button>
          <button
            onClick={handleFreeze}
            disabled={freezeState !== 'idle'}
            className={`px-7 py-2.5 rounded-xl text-xs font-mono-ui font-bold tracking-widest transition-all flex items-center gap-2 ${
              freezeState === 'frozen'
                ? 'bg-[#00C853] text-black shadow-[0_0_20px_rgba(0,200,83,0.4)]'
                : freezeState === 'freezing'
                ? 'bg-amber-600 text-white animate-pulse cursor-wait'
                : 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(255,77,79,0.4)] hover:shadow-[0_0_30px_rgba(255,77,79,0.6)] hover:scale-105'
            }`}
          >
            {freezeState === 'frozen'
              ? <><CheckCircle className="w-3.5 h-3.5" /> FROZEN &amp; DISPATCHED</>
              : freezeState === 'freezing'
              ? 'FREEZING ACCOUNTS…'
              : <><Lock className="w-3.5 h-3.5" /> FREEZE TRANSACTION</>}
          </button>
        </div>
      </motion.div>

      {/* Report Modal */}
      <ReportModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} />
    </div>
  );
};
