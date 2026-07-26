'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Download, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { useAegis } from '../context/AegisContext';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose }) => {
  const { investigation, triggerGenerateReport, showToast } = useAegis();
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'json'>('pdf');

  if (!isOpen) return null;

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      triggerGenerateReport(selectedFormat, investigation);
      setIsGenerating(false);
      onClose();
    }, 600);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          className="relative w-full max-w-lg rounded-3xl bg-[#0F0F0F] border border-[#D4AF37]/30 shadow-2xl p-6 space-y-6 text-gray-100"
          style={{ boxShadow: '0 0 50px rgba(212,175,55,0.15)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#D4AF37]/15">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/25 flex items-center justify-center">
                <FileText className="w-5 h-5 text-[#D4AF37]" />
              </div>
              <div>
                <h3 className="text-base font-cinzel font-bold text-white">Generate Intelligence Dossier</h3>
                <p className="text-[11px] text-gray-400 font-mono-ui">{investigation.id}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Details Summary */}
          <div className="p-4 rounded-2xl bg-[#141414] border border-white/6 space-y-2 text-xs font-mono-ui">
            <div className="flex justify-between">
              <span className="text-gray-500">Case Title:</span>
              <span className="text-gray-200 font-bold">{investigation.caseTitle}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Threat Score:</span>
              <span className="text-red-400 font-bold">{investigation.threatScore} / 100 ({investigation.severity})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Target Account:</span>
              <span className="text-gray-300">{investigation.targetAccount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Transfer Amount:</span>
              <span className="text-red-400 font-bold">{investigation.amount}</span>
            </div>
          </div>

          {/* Format Selector */}
          <div className="space-y-2">
            <label className="text-xs font-mono-ui font-bold text-gray-300 uppercase tracking-wider">
              Select Export Format:
            </label>
            <div className="grid grid-cols-2 gap-3 font-mono-ui text-xs">
              <button
                type="button"
                onClick={() => setSelectedFormat('pdf')}
                className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${
                  selectedFormat === 'pdf'
                    ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-white shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                    : 'bg-[#141414] border-white/10 text-gray-400 hover:text-gray-200'
                }`}
              >
                <FileText className={`w-5 h-5 ${selectedFormat === 'pdf' ? 'text-[#D4AF37]' : 'text-gray-500'}`} />
                <span className="font-bold">Official PDF Dossier</span>
                <span className="text-[9px] text-gray-500">Formatted with MHA Seal & Timestamps</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFormat('json')}
                className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${
                  selectedFormat === 'json'
                    ? 'bg-[#5EA2FF]/10 border-[#5EA2FF] text-white shadow-[0_0_15px_rgba(94,162,255,0.2)]'
                    : 'bg-[#141414] border-white/10 text-gray-400 hover:text-gray-200'
                }`}
              >
                <Download className={`w-5 h-5 ${selectedFormat === 'json' ? 'text-[#5EA2FF]' : 'text-gray-500'}`} />
                <span className="font-bold">Raw JSON Object</span>
                <span className="text-[9px] text-gray-500">Complete Raw Evidence Payload</span>
              </button>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-[#141414] border border-white/10 text-gray-400 hover:text-white text-xs font-mono-ui"
            >
              Cancel
            </button>

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-6 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#F2C14E] text-black text-xs font-mono-ui font-bold tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)] flex items-center gap-2 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> GENERATING...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" /> GENERATE & DOWNLOAD
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
