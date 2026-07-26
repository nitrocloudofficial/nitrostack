'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Eye, AlertOctagon, CheckCircle, Clock } from 'lucide-react';
import { useAegis } from '../../context/AegisContext';
import { ReportModal } from '../ReportModal';

import { Variants } from 'framer-motion';

const cardVariants: Variants = {
  hidden:  { opacity: 0, y: 14 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4, ease: [0.16,1,0.3,1] as const } }),
};

export const IntelligenceReportsView: React.FC = () => {
  const { investigation, setSelectedReportModal, triggerGenerateReport, triggerExportData } = useAegis();
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const REPORTS = [
    {
      id: 'RPT-2026-07-DA-001',
      title: 'Digital Arrest Scam Incident Report',
      desc: 'Comprehensive intelligence dossier — Telecom, Voice AI, and Bank Mule findings for CASE-2026-DA-9904.',
      status: 'DRAFT',
      ts: 'July 25, 2026 · 14:32 IST',
      tags: ['Telecom', 'VoiceAI', 'BankMule', 'HITL'],
      size: '2.3 MB',
      data: investigation,
    },
  ];

  return (
    <div className="page-enter max-w-5xl mx-auto space-y-8 pb-16">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-cinzel font-bold text-white">Intelligence Reports</h1>
          <p className="text-sm text-gray-500">Case dossiers · MHA I4C dispatches · Post-incident analysis</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => triggerExportData('csv', 'reports')}
            className="px-4 py-2.5 rounded-xl bg-[#141414] border border-white/10 hover:border-[#D4AF37]/30 text-gray-300 text-xs font-mono-ui font-bold transition-all flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV List
          </button>
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-[#141414] border border-[#D4AF37]/25 hover:border-[#D4AF37]/45 text-[#D4AF37] text-xs font-mono-ui font-bold transition-all flex items-center gap-2 hover:bg-[#1A1A1A] shrink-0"
          >
            <FileText className="w-3.5 h-3.5" /> Generate New Report
          </button>
        </div>
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {REPORTS.map((rpt, i) => (
          <motion.div
            key={rpt.id}
            custom={i} variants={cardVariants} initial="hidden" animate="visible"
            className="card p-7 border border-[#D4AF37]/15 hover:border-[#D4AF37]/30"
          >
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-[#D4AF37]/8 border border-[#D4AF37]/20 flex items-center justify-center shrink-0 mt-0.5">
                  <FileText className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-[10px] font-mono-ui text-gray-500">{rpt.id}</span>
                    <span className={`text-[9px] font-mono-ui font-bold px-2 py-0.5 rounded border ${
                      rpt.status === 'DRAFT'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                        : 'bg-[#00C853]/10 text-[#00C853] border-[#00C853]/25'
                    }`}>
                      {rpt.status}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-gray-100">{rpt.title}</h3>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{rpt.desc}</p>
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    {rpt.tags.map(tag => (
                      <span key={tag} className="badge-gold text-[9px] px-2 py-0.5 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-3 shrink-0">
                <div className="text-[10px] font-mono-ui text-gray-500">{rpt.ts}</div>
                <div className="text-[10px] font-mono-ui text-gray-600">{rpt.size}</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedReportModal(rpt.data)}
                    title="View Detailed Dossier"
                    className="p-2 rounded-xl bg-[#141414] border border-white/8 text-gray-500 hover:text-[#D4AF37] hover:border-[#D4AF37]/25 transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => triggerGenerateReport('pdf', rpt.data)}
                    title="Download PDF Dossier"
                    className="p-2 rounded-xl bg-[#141414] border border-white/8 text-gray-500 hover:text-[#D4AF37] hover:border-[#D4AF37]/25 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      <motion.div custom={1} variants={cardVariants} initial="hidden" animate="visible"
        className="card p-12 flex flex-col items-center text-center border border-white/5"
      >
        <div className="w-14 h-14 rounded-3xl bg-[#141414] border border-[#D4AF37]/15 flex items-center justify-center mb-5">
          <FileText className="w-6 h-6 text-gray-600" />
        </div>
        <div className="text-gray-400 font-semibold">1 Active Report Dossier Available</div>
        <div className="text-sm text-gray-600 mt-2 max-w-md">
          New case dossiers will be generated automatically as investigations complete. Historical reports will be stored and searchable here.
        </div>
      </motion.div>

      {/* Generate Report Selection Modal */}
      <ReportModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} />
    </div>
  );
};
