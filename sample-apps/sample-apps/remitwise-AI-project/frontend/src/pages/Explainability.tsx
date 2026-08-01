import React from 'react';
import { motion } from 'framer-motion';
import {
  HelpCircle,
  CheckCircle2,
  ShieldCheck,
  Database,
  Award,
  Zap,
  TrendingUp,
  Scale,
  FileText,
} from 'lucide-react';
import { useTransfer } from '../contexts/TransferContext';
import { ConfidenceMeter } from '../components/common/ConfidenceMeter';

export const Explainability: React.FC = () => {
  const { recommendation, request } = useTransfer();

  const decisionFactors = recommendation?.decisionFactors || [
    { title: 'Lowest Transfer Fee', passed: true, description: 'Wise fee is $3.50 compared to Western Union ($4.99) and traditional bank wires ($35.00).' },
    { title: 'Best Mid-Market Exchange Rate', passed: true, description: 'Wise applies 0.0% exchange rate markup (1 USD = 87.25 INR vs bank 84.50 INR).' },
    { title: 'Fastest Payout Speed', passed: true, description: 'Direct integration with National Payments Corporation of India (NPCI) UPI network delivers funds in < 2 hours.' },
    { title: 'Full RBI LRS Compliance Cleared', passed: true, description: 'Amount ($1,000) falls well within the $250,000 annual Liberalised Remittance Scheme daily limit.' },
    { title: 'Optimal FX Rate Window', passed: true, description: 'Timing Agent confirmed 7-day rate trend is in top 5% peak for current cycle.' },
    { title: 'Sanctions & PEP Check Passed', passed: true, description: 'Compliance Agent ran automated OFAC, FinCEN, and CBUAE sanction checks with 0 risk flags.' },
  ];

  const dataSources = recommendation?.sourcesUsed || [
    'Frankfurter API (Live Foreign Exchange Rates)',
    'providers.json (Local Provider Fees & Delivery Capabilities Dataset)',
    'compliance_rules.json (Country Regulatory Limits & Document Checklists)',
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header Banner */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs border border-blue-500/20">
          <HelpCircle className="w-4 h-4 text-blue-500" />
          <span>AI TRANSPARENCY & AUDIT MATRIX</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Why Did AI Recommend Wise?
        </h1>
        <p className="text-sm text-slate-500 max-w-xl mx-auto">
          Full decision matrix, weighted criteria breakdown, and data provenance audit behind the AI recommendation.
        </p>
      </div>

      {/* CONFIDENCE & SUMMARY BOX */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Recommended Provider</span>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white">Wise (UPI Direct)</div>
          </div>
          <div className="sm:w-72">
            <ConfidenceMeter score={97} label="Audit Approved" />
          </div>
        </div>
      </div>

      {/* DECISION FACTORS CHECKLIST */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Scale className="w-5 h-5 text-emerald-500" />
          <span>Evaluation Criteria & Multi-Factor Scoring</span>
        </h2>

        <div className="space-y-4">
          {decisionFactors.map((factor, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.08 }}
              className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-start gap-3.5"
            >
              <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <span>✔ {factor.title}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {factor.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* DATA SOURCES PROVENANCE */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-500" />
          <span>Data Sources Used for Execution</span>
        </h2>

        <div className="space-y-3 font-mono text-xs">
          {dataSources.map((source, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg bg-slate-900 text-slate-200 border border-slate-800 flex items-center gap-2.5"
            >
              <FileText className="w-4 h-4 text-teal-400" />
              <span>{source}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
