'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Download, ShieldAlert, PhoneCall, Mic, Building2, Lock, CheckCircle2 } from 'lucide-react';
import { useAegis } from '../context/AegisContext';

export const ReportViewerModal: React.FC = () => {
  const { selectedReportModal, setSelectedReportModal, triggerGenerateReport } = useAegis();

  if (!selectedReportModal) return null;

  const data = selectedReportModal;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 md:p-8"
        onClick={() => setSelectedReportModal(null)}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#0F0F0F] border border-[#D4AF37]/30 shadow-2xl p-6 md:p-8 space-y-6 text-gray-100"
          style={{ boxShadow: '0 0 60px rgba(212,175,55,0.15), 0 32px 64px rgba(0,0,0,0.9)' }}
        >
          {/* Close X */}
          <button
            onClick={() => setSelectedReportModal(null)}
            className="absolute top-6 right-6 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="flex items-start gap-4 pb-6 border-b border-[#D4AF37]/15">
            <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6 text-[#D4AF37]" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="badge-critical">CLASSIFIED DOSSIER</span>
                <span className="text-xs font-mono-ui text-gray-500">{data.id}</span>
              </div>
              <h2 className="text-xl font-cinzel font-bold text-white">{data.caseTitle}</h2>
              <p className="text-xs text-gray-400 font-mono-ui mt-0.5">
                Target: {data.targetAccount} ({data.customerName}) · Amount: <span className="text-red-400 font-bold">{data.amount}</span>
              </p>
            </div>
          </div>

          {/* Metric Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono-ui">
            <div className="p-4 rounded-2xl bg-[#141414] border border-white/6">
              <div className="text-gray-500 text-[10px] uppercase mb-1">Threat Score</div>
              <div className="text-xl font-bold text-red-500">{data.threatScore} / 100</div>
              <div className="text-[10px] text-red-400 mt-0.5">{data.severity} THREAT</div>
            </div>
            <div className="p-4 rounded-2xl bg-[#141414] border border-white/6">
              <div className="text-gray-500 text-[10px] uppercase mb-1">Current Status</div>
              <div className="text-sm font-bold text-[#D4AF37]">{data.status}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">MHA I4C Clearance</div>
            </div>
            <div className="p-4 rounded-2xl bg-[#141414] border border-white/6">
              <div className="text-gray-500 text-[10px] uppercase mb-1">Generated Timestamp</div>
              <div className="text-xs font-semibold text-gray-200">{data.timestamp}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">IST Time Zone</div>
            </div>
            <div className="p-4 rounded-2xl bg-[#141414] border border-white/6">
              <div className="text-gray-500 text-[10px] uppercase mb-1">Assigned Officer</div>
              <div className="text-xs font-semibold text-gray-200">{data.decision.officerName}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">{data.decision.clearance}</div>
            </div>
          </div>

          {/* 3 Pillars Summary */}
          <div className="space-y-4">
            <h3 className="text-xs font-mono-ui font-bold text-[#D4AF37] uppercase tracking-wider">
              Multi-Vector Intelligence Findings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono-ui">
              {/* Telecom */}
              <div className="p-4 rounded-2xl bg-[#141414] border border-red-500/20 space-y-2">
                <div className="flex items-center gap-2 text-[#D4AF37] font-bold pb-2 border-b border-white/5">
                  <PhoneCall className="w-4 h-4" /> Telecom Intelligence
                </div>
                <div>Caller ID: <span className="text-red-400 font-bold">{data.telecom.callerId}</span></div>
                <div>Origin: <span className="text-gray-200">{data.telecom.origin}</span></div>
                <div>STIR/SHAKEN: <span className="text-red-400 font-bold">{data.telecom.stirShaken}</span></div>
                <div>Duration: <span className="text-amber-400">{data.telecom.duration}</span></div>
              </div>

              {/* Voice */}
              <div className="p-4 rounded-2xl bg-[#141414] border border-[#5EA2FF]/20 space-y-2">
                <div className="flex items-center gap-2 text-[#5EA2FF] font-bold pb-2 border-b border-white/5">
                  <Mic className="w-4 h-4" /> Voice Biometrics
                </div>
                <div>AI Confidence: <span className="text-red-400 font-bold">{data.voice.aiConfidence}</span></div>
                <div>Model: <span className="text-gray-200">{data.voice.model}</span></div>
                <div>Micro-Tremor: <span className="text-red-400">{data.voice.microTremor}</span></div>
                <div>Verdict: <span className="text-red-400 font-bold">{data.voice.verdict}</span></div>
              </div>

              {/* Bank */}
              <div className="p-4 rounded-2xl bg-[#141414] border border-[#00C853]/20 space-y-2">
                <div className="flex items-center gap-2 text-[#00C853] font-bold pb-2 border-b border-white/5">
                  <Building2 className="w-4 h-4" /> Bank Mule Network
                </div>
                <div>Target Account: <span className="text-amber-400 font-bold">{data.bank.destinationAccount}</span></div>
                <div>Account Age: <span className="text-amber-400">{data.bank.accountAge}</span></div>
                <div>Velocity (24h): <span className="text-red-400">{data.bank.velocity24h}</span></div>
                <div>Verdict: <span className="text-red-400 font-bold">{data.bank.verdict}</span></div>
              </div>
            </div>
          </div>

          {/* Pipeline Execution Timeline */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-mono-ui font-bold text-[#D4AF37] uppercase tracking-wider">
              Execution Timeline
            </h3>
            <div className="space-y-2">
              {data.timeline.map((step) => (
                <div key={step.step} className="p-3 rounded-xl bg-[#141414] border border-white/5 text-xs font-mono-ui flex items-center justify-between">
                  <div>
                    <span className="text-[#D4AF37] font-bold mr-2">Step {step.step}:</span>
                    <span className="text-gray-200 font-semibold">{step.title}</span>
                    <span className="text-gray-500 ml-2">— {step.desc}</span>
                  </div>
                  <span className="text-[10px] text-gray-500 shrink-0">{step.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-6 border-t border-white/10">
            <div className="text-xs font-mono-ui text-gray-500">
              Clearance: <span className="text-[#D4AF37] font-bold">{data.decision.clearance}</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => triggerGenerateReport('json', data)}
                className="px-4 py-2.5 rounded-xl bg-[#141414] border border-white/10 hover:border-[#D4AF37]/40 text-gray-300 text-xs font-mono-ui font-bold transition-all flex items-center gap-2"
              >
                <Download className="w-3.5 h-3.5" /> EXPORT JSON
              </button>

              <button
                onClick={() => triggerGenerateReport('pdf', data)}
                className="px-6 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#F2C14E] text-black text-xs font-mono-ui font-bold transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)] flex items-center gap-2"
              >
                <Download className="w-3.5 h-3.5" /> DOWNLOAD OFFICIAL PDF DOSSIER
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
