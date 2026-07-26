'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertOctagon, PhoneCall, Mic, Building2, Lock, FileText, X, CheckCircle } from 'lucide-react';
import { useAegis } from '../context/AegisContext';

interface CriticalAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFreezeApproved: () => void;
  threatScore?: number;
}

export const CriticalAlertModal: React.FC<CriticalAlertModalProps> = ({
  isOpen,
  onClose,
  onFreezeApproved,
  threatScore: propThreatScore,
}) => {
  const { investigation, freezeState, handleFreezeTransaction, triggerGenerateReport } = useAegis();
  const currentThreatScore = propThreatScore !== undefined ? propThreatScore : (investigation?.threatScore ?? 94);

  if (!isOpen) return null;

  const handleFreeze = () => {
    handleFreezeTransaction();
    setTimeout(() => {
      onFreezeApproved();
    }, 1200);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Cinematic backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md"
            style={{ backdropFilter: 'blur(12px) brightness(0.7)' }}
            onClick={onClose}
          />

          {/* Red ambient glow */}
          <div
            className="fixed inset-0 z-50 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 40%, rgba(255,77,79,0.12) 0%, transparent 70%)' }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 pointer-events-none"
          >
            <div
              className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl bg-[#0F0808] border border-red-500/40 shadow-2xl pointer-events-auto"
              style={{ boxShadow: '0 0 80px rgba(255,77,79,0.2), 0 32px 80px rgba(0,0,0,0.8)' }}
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between p-8 border-b border-red-500/20">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center shrink-0">
                    <AlertOctagon className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono-ui font-bold text-red-400/80 uppercase tracking-widest mb-1">
                      HIGH-SEVERITY INCIDENT • HITL REQUIRED
                    </div>
                    <h2 className="text-xl font-cinzel font-bold text-white tracking-wide">
                      🚨 Digital Arrest Scam Detected
                    </h2>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl bg-white/5 text-gray-500 hover:text-white hover:bg-white/10 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Threat Score + Summary */}
              <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Gauge */}
                <div className="md:col-span-1 flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-black/60 border border-red-500/20">
                  <div className="relative w-28 h-28">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" stroke="rgba(255,77,79,0.1)" strokeWidth="8" fill="none" />
                      <circle
                        cx="50" cy="50" r="40"
                        stroke="#FF4D4F"
                        strokeWidth="8"
                        strokeLinecap="round"
                        fill="none"
                        strokeDasharray={251.2}
                        strokeDashoffset={251.2 - (251.2 * currentThreatScore) / 100}
                        style={{ filter: 'drop-shadow(0 0 6px #FF4D4F)' }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold font-mono-ui text-red-500 leading-none">{currentThreatScore}</span>
                      <span className="text-[8px] font-mono-ui text-gray-500 uppercase tracking-widest mt-1">Threat Score</span>
                    </div>
                  </div>
                  <div className="badge-critical">{investigation.severity || 'CRITICAL'}</div>
                </div>

                {/* Evidence columns */}
                <div className="md:col-span-2 space-y-4">
                  {/* Telecom */}
                  <div className="p-4 rounded-2xl bg-black/40 border border-[#D4AF37]/15 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#D4AF37]">
                      <PhoneCall className="w-3.5 h-3.5" /> Telecom Finding
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono-ui text-gray-400">
                      <div>STIR/SHAKEN: <span className="text-red-400 font-bold">{investigation.telecom.stirShaken}</span></div>
                      <div>Origin: <span className="text-gray-200">{investigation.telecom.origin}</span></div>
                      <div>Duration: <span className="text-amber-400">{investigation.telecom.duration}</span></div>
                      <div>Caller ID: <span className="text-red-400">{investigation.telecom.callerId}</span></div>
                    </div>
                  </div>

                  {/* Voice */}
                  <div className="p-4 rounded-2xl bg-black/40 border border-[#5EA2FF]/20 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#5EA2FF]">
                      <Mic className="w-3.5 h-3.5" /> Voice Biometric Finding
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono-ui text-gray-400">
                      <div>AI Probability: <span className="text-red-400 font-bold">{investigation.voice.aiConfidence}</span></div>
                      <div>Model: <span className="text-gray-200">{investigation.voice.model}</span></div>
                      <div>Micro-Tremor: <span className="text-red-400">{investigation.voice.microTremor}</span></div>
                      <div>Formant: <span className="text-red-400">{investigation.voice.formantStatus}</span></div>
                    </div>
                  </div>

                  {/* Bank */}
                  <div className="p-4 rounded-2xl bg-black/40 border border-[#00C853]/20 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#00C853]">
                      <Building2 className="w-3.5 h-3.5" /> Bank Mule Finding
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono-ui text-gray-400">
                      <div>Transfer: <span className="text-red-400 font-bold">{investigation.amount}</span></div>
                      <div>Destination: <span className="text-gray-200">{investigation.bank.destinationAccount} ({investigation.bank.accountAge})</span></div>
                      <div>24h Velocity: <span className="text-red-400">{investigation.bank.velocity24h}</span></div>
                      <div>Verdict: <span className="text-red-400 font-bold">{investigation.bank.verdict}</span></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recommended action */}
              <div className="px-8 pb-6">
                <div className="p-4 rounded-2xl bg-red-950/30 border border-red-500/25 text-xs text-gray-300 leading-relaxed font-sans">
                  <span className="text-red-400 font-bold">Recommended Action: </span>
                  {investigation.decision.recommendation}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-8 pb-8 pt-2 border-t border-white/5">
                <div className="text-[11px] font-mono-ui text-gray-500">
                  Officer: <span className="text-[#D4AF37] font-bold">AZ-99</span> · Clearance: L5
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => triggerGenerateReport('pdf')}
                    className="px-5 py-2.5 rounded-xl bg-[#141414] border border-white/10 text-gray-400 hover:text-white hover:bg-[#1A1A1A] transition-all text-[11px] font-mono-ui flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5" /> Generate Report
                  </button>
                  <button
                    onClick={handleFreeze}
                    disabled={freezeState !== 'idle'}
                    className={`px-7 py-2.5 rounded-xl text-[11px] font-mono-ui font-bold tracking-widest transition-all flex items-center gap-2 ${
                      freezeState === 'frozen'
                        ? 'bg-[#00C853] text-black shadow-[0_0_25px_rgba(0,200,83,0.4)]'
                        : freezeState === 'freezing'
                        ? 'bg-amber-600 text-white animate-pulse cursor-wait'
                        : 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(255,77,79,0.4)] hover:shadow-[0_0_35px_rgba(255,77,79,0.6)] hover:scale-105'
                    }`}
                  >
                    {freezeState === 'frozen'
                      ? <><CheckCircle className="w-3.5 h-3.5" /> FROZEN & DISPATCHED</>
                      : freezeState === 'freezing'
                      ? 'FREEZING ACCOUNTS…'
                      : <><Lock className="w-3.5 h-3.5" /> FREEZE TRANSACTION</>}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
