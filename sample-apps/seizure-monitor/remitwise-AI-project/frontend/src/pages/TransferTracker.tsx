import React from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle2, Building, ShieldCheck, ArrowRight, Lock } from 'lucide-react';
import { useTransfer } from '../contexts/TransferContext';

export const TransferTracker: React.FC = () => {
  const { recommendation } = useTransfer();
  const trackingId = recommendation?.trackingId || 'RWT-99824XA';

  const trackerSteps = [
    { title: 'Transfer Initiated', desc: 'Transfer order created & rate locked at 87.25 INR', status: 'completed', time: '14:22:04' },
    { title: 'Identity & KYC Verification', desc: 'Pre-cleared by Compliance Agent', status: 'completed', time: '14:22:06' },
    { title: 'Payment Processing', desc: 'Debit Card payment settled with Wise', status: 'completed', time: '14:22:10' },
    { title: 'Intermediary Bank Hop', desc: 'Dispatched to NPCI Partner Gateway', status: 'in_progress', time: 'In Progress' },
    { title: 'Recipient Bank Credit', desc: 'Direct credit to Indian Bank Account via UPI', status: 'pending', time: 'Est. 16:20' },
    { title: 'Transfer Completed', desc: 'Final confirmation & digital receipt issuance', status: 'pending', time: 'Est. 16:22' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs border border-blue-500/20">
          <Clock className="w-3.5 h-3.5" />
          <span>CRYPTOGRAPHIC TRANSFER STATUS TRACKER</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Track Your Remittance Progress
        </h1>
        <p className="text-sm font-mono text-slate-500">
          Tracking Hash: <span className="text-blue-500 font-bold">{trackingId}</span> | Provider: Wise (UPI Direct)
        </p>
      </div>

      {/* TIMELINE PROGRESS PANEL */}
      <div className="glass-panel p-6 sm:p-10 rounded-3xl border border-slate-200/80 dark:border-slate-800 space-y-8">
        <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-4 sm:ml-8 space-y-8 pl-6 sm:pl-10">
          {trackerSteps.map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.1 }}
              className="relative"
            >
              {/* Dot Icon */}
              <div
                className={`absolute -left-[31px] sm:-left-[47px] top-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-md ${
                  step.status === 'completed'
                    ? 'bg-emerald-500 text-white'
                    : step.status === 'in_progress'
                    ? 'bg-blue-600 text-white ring-4 ring-blue-500/20 animate-pulse'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                }`}
              >
                {step.status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
              </div>

              {/* Step Info */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">{step.title}</h3>
                  <span className="text-xs font-mono font-semibold text-slate-500">{step.time}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
