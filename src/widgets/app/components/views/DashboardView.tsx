'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  ShieldCheck,
  IndianRupee,
  Activity,
  AlertTriangle,
  Cpu,
  PhoneCall,
  Mic,
  Building2,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  User,
  ChevronRight,
  ShieldAlert,
  Lock,
  Layers,
  Sparkles,
  Zap
} from 'lucide-react';

import { useAegis, TestCaseItem } from '../../context/AegisContext';

interface DashboardViewProps {
  onInspectThreat: () => void;
}

const STATS_DATA = [
  { id: '1', title: 'Transactions Today', value: '1,247', change: '+12.4%', isPositive: true, icon: Activity, spark: [20, 35, 45, 30, 55, 65, 80] },
  { id: '2', title: 'Threats Prevented', value: '84', change: '+18.2%', isPositive: true, icon: ShieldCheck, spark: [10, 15, 30, 25, 40, 60, 84] },
  { id: '3', title: 'Money Protected', value: '₹18.42 Cr', change: '+24.5%', isPositive: true, icon: IndianRupee, spark: [5, 12, 18, 22, 35, 50, 75] },
  { id: '4', title: 'Avg Threat Score', value: '18 / 100', change: '-4.1%', isPositive: true, icon: AlertTriangle, spark: [40, 35, 25, 30, 20, 18, 15] },
  { id: '5', title: 'Investigations Active', value: '3 Active', change: '2 Critical', isPositive: false, icon: ShieldAlert, spark: [1, 2, 2, 3, 4, 3, 3] },
  { id: '6', title: 'AI Model Accuracy', value: '99.4%', change: '+0.2%', isPositive: true, icon: Cpu, spark: [98, 98.5, 98.8, 99.1, 99.3, 99.4, 99.4] },
];

const TRANSACTIONS_QUEUE = [
  { id: 'TXN-998822019', customer: 'Rameshwar Sharma (Retd. GM)', bank: 'HDFC Bank', amount: '₹ 50,00,000', risk: 'CRITICAL', time: '14:28:12', status: 'FLAGGED', score: 94 },
  { id: 'TXN-884210943', customer: 'Sunita Narain', bank: 'State Bank of India', amount: '₹ 2,50,000', risk: 'LOW', time: '14:26:05', status: 'CLEARED', score: 12 },
  { id: 'TXN-773199402', customer: 'Vikram Mehta', bank: 'ICICI Bank', amount: '₹ 15,00,000', risk: 'HIGH', time: '14:24:40', status: 'IN_REVIEW', score: 78 },
  { id: 'TXN-662011984', customer: 'Ananya Deshmukh', bank: 'Axis Bank', amount: '₹ 45,000', risk: 'LOW', time: '14:22:15', status: 'CLEARED', score: 8 },
  { id: 'TXN-551900231', customer: 'Ketan Parikh', bank: 'Kotak Mahindra', amount: '₹ 8,20,000', risk: 'MEDIUM', time: '14:19:50', status: 'MONITORING', score: 42 },
];

export const DashboardView: React.FC<DashboardViewProps> = ({ onInspectThreat }) => {
  const { testCases, selectedTestCaseId, setSelectedTestCaseId, simulateScam, isSimulating, settings } = useAegis();
  const [selectedTxn, setSelectedTxn] = useState(TRANSACTIONS_QUEUE[0]);
  const [activeStep, setActiveStep] = useState(0);

  const shouldAutoFreeze = settings.autoFreeze || !settings.hitlRequired;

  // Sequential animation for timeline steps
  useEffect(() => {
    const timer1 = setTimeout(() => setActiveStep(1), 400);
    const timer2 = setTimeout(() => setActiveStep(2), 800);
    const timer3 = setTimeout(() => setActiveStep(3), 1200);
    const timer4 = setTimeout(() => setActiveStep(4), 1600);
    const timer5 = setTimeout(() => setActiveStep(5), 2000);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timer5);
    };
  }, [selectedTxn]);

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* ═══ 1. TOP STATS CARDS GRID ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {STATS_DATA.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              className="relative p-4 rounded-2xl bg-gradient-to-b from-[#141414] to-[#0E0E0E] border border-[#D4AF37]/20 hover:border-[#D4AF37]/50 transition-all duration-300 group shadow-lg hover:-translate-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider">
                  {stat.title}
                </span>
                <div className="p-2 rounded-xl bg-[#1A1A1A] text-[#F2C14E] border border-[#D4AF37]/20 group-hover:scale-110 transition-transform">
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-xl font-bold font-mono text-white tracking-tight">
                  {stat.value}
                </span>
                <span className={`text-[10px] font-mono font-semibold flex items-center gap-0.5 ${stat.isPositive ? 'text-emerald-400' : 'text-amber-400'}`}>
                  <TrendingUp className="w-3 h-3" />
                  {stat.change}
                </span>
              </div>

              {/* Sparkline visualization */}
              <div className="mt-3 flex items-end gap-1 h-5 overflow-hidden opacity-60 group-hover:opacity-100 transition-opacity">
                {stat.spark.map((val, i) => (
                  <div
                    key={i}
                    style={{ height: `${val}%` }}
                    className="flex-1 rounded-t bg-gradient-to-t from-[#D4AF37]/20 to-[#F2C14E]"
                  />
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ═══ TEST SCENARIO SUITE SIMULATION CONTROL ═══ */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-[#18150C] via-[#121212] to-[#0D0D0D] border border-[#D4AF37]/30 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#F2C14E]">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold font-mono text-[#F2C14E] uppercase tracking-wider flex items-center gap-2">
              Multi-Scenario Test Suite & Backend Verification Engine
            </h3>
            <p className="text-[11px] text-gray-400 font-mono mt-0.5">
              Select a test case to execute end-to-end ZK threat fusion pipeline against the Express backend
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={selectedTestCaseId}
            onChange={(e) => setSelectedTestCaseId(e.target.value)}
            className="px-3 py-2 text-xs font-mono bg-[#141414] border border-[#D4AF37]/30 rounded-xl text-gray-100 focus:outline-none focus:border-[#F2C14E]"
          >
            {testCases.map((tc: TestCaseItem) => (
              <option key={tc.id} value={tc.id}>
                {tc.id} — {tc.caseTitle.slice(0, 32)}... ({tc.severity})
              </option>
            ))}
          </select>

          <button
            onClick={() => simulateScam(selectedTestCaseId)}
            disabled={isSimulating}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F2C14E] hover:from-[#c29f2f] hover:to-[#e0b240] text-black text-xs font-bold font-mono shadow-[0_0_15px_rgba(212,175,55,0.4)] disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isSimulating ? 'SIMULATING...' : 'RUN TEST CASE'}
          </button>
        </div>
      </div>

      {/* ═══ 2. MAIN 3-COLUMN SOC CONTENT ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ─── LEFT COLUMN (4 Cols): Live Transaction Queue ─── */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold font-cinzel text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#F2C14E]" />
              Live Clearing Queue
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
              5 IN FLIGHT
            </span>
          </div>

          <div className="space-y-3">
            {TRANSACTIONS_QUEUE.map((txn) => {
              const isSelected = selectedTxn.id === txn.id;
              const isCritical = txn.risk === 'CRITICAL';

              return (
                <motion.div
                  key={txn.id}
                  whileHover={{ scale: 1.01 }}
                  onClick={() => setSelectedTxn(txn)}
                  className={`p-4 rounded-2xl cursor-pointer transition-all duration-200 border ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#1A1810] to-[#121212] border-[#F2C14E] shadow-[0_0_20px_rgba(212,175,55,0.25)]'
                      : isCritical
                      ? 'bg-red-950/20 border-red-500/30 hover:border-red-500/60'
                      : 'bg-[#121212] border-[#D4AF37]/15 hover:border-[#D4AF37]/35'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono text-gray-400 font-semibold">
                      {txn.id}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                        txn.risk === 'CRITICAL'
                          ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
                          : txn.risk === 'HIGH'
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      }`}
                    >
                      {txn.risk} RISK ({txn.score})
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-gray-100 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[#F2C14E]" />
                        {txn.customer}
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        {txn.bank} • {txn.time}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-bold font-mono text-[#F2C14E]">
                        {txn.amount}
                      </div>
                      <div className="text-[10px] font-mono text-gray-400 uppercase">
                        {txn.status}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ─── CENTER COLUMN (5 Cols): Investigation Details ─── */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold font-cinzel text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-500" />
              Investigation Details & Fusion Graph
            </h3>
            <button
              onClick={onInspectThreat}
              className="text-[11px] font-mono text-red-400 hover:text-red-300 underline font-semibold flex items-center gap-1"
            >
              Trigger Full Modal <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="p-6 rounded-2xl bg-gradient-to-b from-[#141414] via-[#101010] to-[#0A0A0A] border border-[#D4AF37]/30 shadow-2xl space-y-6">

            {/* Circular Threat Score Gauge Header */}
            <div className="flex items-center gap-6 p-4 rounded-xl bg-black/60 border border-[#D4AF37]/20">
              <div className="relative w-28 h-28 flex items-center justify-center flex-shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.08)" strokeWidth="8" fill="transparent" />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke={selectedTxn.score >= 80 ? '#FF4D4F' : selectedTxn.score >= 50 ? '#F2C14E' : '#00C853'}
                    strokeWidth="8"
                    strokeDasharray={251.2}
                    strokeDashoffset={251.2 - (251.2 * selectedTxn.score) / 100}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-700"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className={`text-2xl font-extrabold font-mono ${selectedTxn.score >= 80 ? 'text-red-500' : 'text-[#F2C14E]'}`}>
                    {selectedTxn.score}
                  </span>
                  <span className="text-[9px] font-mono text-gray-400 tracking-wider">SCORE</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-950/80 text-red-400 border border-red-500/40 uppercase font-bold">
                  {selectedTxn.risk} THREAT LEVEL
                </span>
                <h4 className="text-base font-bold text-white mt-1.5">
                  Digital Arrest Scam Vector
                </h4>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  Offshore Cambodian VoIP call spoofing CBI Cyber Crime HQ, coercing immediate transfer to 3-day old mule account.
                </p>
              </div>
            </div>

            {/* Target Account Summary */}
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-black/40 border border-gray-800">
                <span className="text-gray-400 text-[10px]">VICTIM TARGET</span>
                <div className="font-bold text-gray-200 mt-0.5">{selectedTxn.customer}</div>
                <div className="text-[10px] text-[#F2C14E]">HDFC-****4521</div>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-gray-800">
                <span className="text-gray-400 text-[10px]">TRANSFER AMOUNT</span>
                <div className="font-bold text-red-400 text-sm mt-0.5">{selectedTxn.amount}</div>
                <div className="text-[10px] text-gray-400">RTGS / Fast Clearance</div>
              </div>
            </div>

            {/* Sequential Investigation Timeline Steps */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-gray-300 uppercase tracking-wider font-mono">
                AI Pipeline Execution Steps:
              </div>

              <div className="space-y-2.5">
                {[
                  { title: 'Telecom Metadata Analysis', desc: 'STIR/SHAKEN Handshake & Cambodian VoIP Node Detected', step: 1 },
                  { title: 'Voice Biometrics Synthesis', desc: 'AI Neural Voice matched with 96% confidence', step: 2 },
                  { title: 'Bank Mule Velocity Graph', desc: 'Destination account 3 days old with 14 transfers today', step: 3 },
                  { title: 'Zero-Knowledge Threat Fusion', desc: 'Multi-vector threat score calculated at 94/100', step: 4 },
                  { 
                    title: shouldAutoFreeze ? 'Auto-Freeze Executed (No HITL)' : 'Awaiting Human Approval (HITL)', 
                    desc: shouldAutoFreeze ? 'Auto-freeze rule active: Account frozen without HITL approval' : 'Fraud Officer decision required before funds release', 
                    step: 5 
                  },
                ].map((item) => {
                  const isDone = activeStep >= item.step;
                  const isCurrent = activeStep === item.step - 1;

                  return (
                    <motion.div
                      key={item.step}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: isDone ? 1 : 0.4, x: 0 }}
                      className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                        isDone
                          ? 'bg-black/50 border-[#D4AF37]/30 text-gray-200'
                          : 'bg-black/20 border-gray-800 text-gray-500'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono ${
                        isDone ? 'bg-[#D4AF37] text-black shadow-[0_0_10px_rgba(212,175,55,0.5)]' : 'bg-gray-800 text-gray-400'
                      }`}>
                        {isDone ? '✓' : item.step}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold">{item.title}</div>
                        <div className="text-[11px] text-gray-400 truncate">{item.desc}</div>
                      </div>

                      {isDone && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Action Trigger Banner */}
            <button
              onClick={onInspectThreat}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold text-xs uppercase tracking-widest shadow-[0_0_25px_rgba(255,77,79,0.5)] flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
            >
              <Zap className="w-4 h-4 text-yellow-300" />
              REVIEW & FREEZE TRANSACTION
            </button>
          </div>
        </div>

        {/* ─── RIGHT COLUMN (3 Cols): 3 Intelligence Cards ─── */}
        <div className="lg:col-span-3 space-y-4">
          <h3 className="text-sm font-bold font-cinzel text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#F2C14E]" />
            Intelligence Streams
          </h3>

          {/* Card 1: Telecom Intelligence */}
          <div className="p-4 rounded-2xl bg-[#121212] border border-[#D4AF37]/20 space-y-3 hover:border-[#D4AF37]/40 transition-all">
            <div className="flex items-center justify-between pb-2 border-b border-gray-800">
              <div className="flex items-center gap-2 text-xs font-bold text-[#F2C14E]">
                <PhoneCall className="w-4 h-4 text-[#F2C14E]" />
                Telecom Intelligence
              </div>
              <span className="text-[10px] font-mono text-red-400 font-bold">FLAGGED</span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between text-gray-400">
                <span>STIR/SHAKEN:</span>
                <span className="text-red-400 font-bold">FAILED</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>True Origin:</span>
                <span className="text-gray-200">Cambodia VoIP</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Call Duration:</span>
                <span className="text-amber-400 font-bold">84 Minutes</span>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-800/60 flex items-center justify-between text-[10px] text-gray-400 font-mono">
              <span>Risk Metric:</span>
              <div className="w-24 bg-gray-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-red-500 h-full w-[90%]" />
              </div>
            </div>
          </div>

          {/* Card 2: Voice Intelligence */}
          <div className="p-4 rounded-2xl bg-[#121212] border border-[#D4AF37]/20 space-y-3 hover:border-[#D4AF37]/40 transition-all">
            <div className="flex items-center justify-between pb-2 border-b border-gray-800">
              <div className="flex items-center gap-2 text-xs font-bold text-[#4F8CFF]">
                <Mic className="w-4 h-4 text-[#4F8CFF]" />
                Voice Biometrics
              </div>
              <span className="text-[10px] font-mono text-red-400 font-bold">96% SYNTHESIS</span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between text-gray-400">
                <span>Acoustic Model:</span>
                <span className="text-gray-200">VoiceGuard-v4.2</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Formant Shift:</span>
                <span className="text-red-400 font-bold">F2 Phase Discontinuity</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Micro-Tremor:</span>
                <span className="text-red-400 font-bold">MISSING</span>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-800/60 flex items-center justify-between text-[10px] text-gray-400 font-mono">
              <span>Confidence:</span>
              <div className="w-24 bg-gray-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full w-[96%]" />
              </div>
            </div>
          </div>

          {/* Card 3: Bank Mule Intelligence */}
          <div className="p-4 rounded-2xl bg-[#121212] border border-[#D4AF37]/20 space-y-3 hover:border-[#D4AF37]/40 transition-all">
            <div className="flex items-center justify-between pb-2 border-b border-gray-800">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                <Building2 className="w-4 h-4 text-emerald-400" />
                Bank Mule Graph
              </div>
              <span className="text-[10px] font-mono text-amber-400 font-bold">NEW ACCOUNT</span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between text-gray-400">
                <span>Account Age:</span>
                <span className="text-amber-400 font-bold">3 Days Old</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>24h Velocity:</span>
                <span className="text-red-400 font-bold">14 Transfers (₹1.4 Cr)</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Mule Verdict:</span>
                <span className="text-red-400 font-bold">CRITICAL MULE</span>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-800/60 flex items-center justify-between text-[10px] text-gray-400 font-mono">
              <span>Mule Risk Score:</span>
              <div className="w-24 bg-gray-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-400 h-full w-[88%]" />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
