'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Lock,
  PhoneCall,
  Mic,
  Building2,
  AlertTriangle,
  CheckCircle,
  Clock,
  ExternalLink,
  FileText,
  UserCheck
} from 'lucide-react';

interface InvestigationItem {
  id: string;
  caseTitle: string;
  targetAccount: string;
  amount: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  threatScore: number;
  status: 'AWAITING_HITL' | 'UNDER_REVIEW' | 'FROZEN';
  timestamp: string;
  details: {
    callerId: string;
    origin: string;
    aiVoiceConfidence: string;
    muleAccountAge: string;
    transfers24h: number;
  };
}

const INVESTIGATIONS_LIST: InvestigationItem[] = [
  {
    id: 'CASE-2026-DIGITAL-ARREST-9904',
    caseTitle: 'CBI Cyber Crime HQ Spoof & Digital Arrest Coercion',
    targetAccount: 'HDFC-****4521 (Rameshwar Sharma)',
    amount: '₹ 50,00,000',
    severity: 'CRITICAL',
    threatScore: 94,
    status: 'AWAITING_HITL',
    timestamp: '2026-07-25 14:28:12',
    details: {
      callerId: '+91-11-23012345 (DoT / CBI HQ)',
      origin: 'Phnom Penh VoIP Gateway (AS13824)',
      aiVoiceConfidence: '96% Synthetic (VoiceGuard-v4.2)',
      muleAccountAge: '3 Days Old (SBI Mumbai)',
      transfers24h: 14,
    },
  },
  {
    id: 'CASE-2026-VOICE-CLONE-8812',
    caseTitle: 'Voice Synthetic Impersonation of Family Member',
    targetAccount: 'ICICI-****9921 (Suresh Patel)',
    amount: '₹ 15,00,000',
    severity: 'HIGH',
    threatScore: 78,
    status: 'UNDER_REVIEW',
    timestamp: '2026-07-25 13:40:05',
    details: {
      callerId: '+91-9821098765 (Cloned Caller ID)',
      origin: 'Vietnam SIP Trunk Gateway',
      aiVoiceConfidence: '88% Synthetic Model',
      muleAccountAge: '12 Days Old (PNB Delhi)',
      transfers24h: 6,
    },
  },
  {
    id: 'CASE-2026-MULE-LAYERING-4410',
    caseTitle: 'Multi-Hop Rapid Layering Mule Ring',
    targetAccount: 'AXIS-****1122 (Meera Iyer)',
    amount: '₹ 28,00,000',
    severity: 'HIGH',
    threatScore: 72,
    status: 'FROZEN',
    timestamp: '2026-07-25 12:15:30',
    details: {
      callerId: 'Unknown Unregistered SIP',
      origin: 'Domestic Spoofed Node',
      aiVoiceConfidence: 'Human Voice with Audio Masking',
      muleAccountAge: '1 Day Old (Kotak Mahindra)',
      transfers24h: 22,
    },
  },
];

export const InvestigationsView: React.FC = () => {
  const [filterSeverity, setFilterSeverity] = useState<'ALL' | 'CRITICAL' | 'HIGH'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(INVESTIGATIONS_LIST[0].id);

  const filteredItems = INVESTIGATIONS_LIST.filter((item) => {
    const matchesSev = filterSeverity === 'ALL' || item.severity === filterSeverity;
    const matchesSearch =
      item.caseTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.targetAccount.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSev && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header & Filter Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-[#141414] via-[#101010] to-[#0A0A0A] border border-[#D4AF37]/25 shadow-2xl">
        <div>
          <h2 className="text-lg font-bold font-cinzel text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            Active Incident Investigations
          </h2>
          <p className="text-xs text-gray-400 font-mono">
            {filteredItems.length} Active Dossiers • Human-in-the-Loop Clearance Required
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter cases..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#141414] border border-[#D4AF37]/20 rounded-xl text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#F2C14E]"
            />
          </div>

          {/* Severity Filter Buttons */}
          <div className="flex items-center p-1 bg-[#141414] border border-[#D4AF37]/20 rounded-xl text-xs font-mono">
            {(['ALL', 'CRITICAL', 'HIGH'] as const).map((sev) => (
              <button
                key={sev}
                onClick={() => setFilterSeverity(sev)}
                className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                  filterSeverity === sev
                    ? 'bg-[#D4AF37] text-black shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Expandable Investigation Cards List */}
      <div className="space-y-4">
        {filteredItems.map((item) => {
          const isExpanded = expandedId === item.id;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-[#0F0F0F] border border-[#D4AF37]/20 overflow-hidden shadow-xl"
            >
              {/* Card Header Bar */}
              <div
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                className="p-5 flex items-center justify-between cursor-pointer bg-[#141414] hover:bg-[#181818] transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-bold text-sm border ${
                    item.severity === 'CRITICAL'
                      ? 'bg-red-950/40 text-red-400 border-red-500/40 shadow-[0_0_15px_rgba(255,77,79,0.3)]'
                      : 'bg-amber-950/40 text-amber-400 border-amber-500/40'
                  }`}>
                    {item.threatScore}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-[#F2C14E]">
                        {item.id}
                      </span>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                        item.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      }`}>
                        {item.severity} SEVERITY
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-gray-100 mt-0.5">
                      {item.caseTitle}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right hidden sm:block">
                    <div className="text-xs font-mono font-bold text-[#F2C14E]">{item.amount}</div>
                    <div className="text-[10px] font-mono text-gray-400">{item.timestamp}</div>
                  </div>

                  <button className="p-2 rounded-lg bg-[#222] text-gray-400 hover:text-[#F2C14E]">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Expandable Evidence & Details Body */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="p-6 border-t border-[#D4AF37]/15 bg-black/40 space-y-6"
                  >
                    {/* Evidence Pillars Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
                      {/* Telecom pillar */}
                      <div className="p-4 rounded-xl bg-[#141414] border border-gray-800 space-y-2">
                        <div className="text-xs font-bold text-[#F2C14E] flex items-center gap-1.5 pb-2 border-b border-gray-800">
                          <PhoneCall className="w-4 h-4" /> TELECOM EVIDENCE
                        </div>
                        <div className="text-gray-300">Caller ID: <span className="text-red-400">{item.details.callerId}</span></div>
                        <div className="text-gray-300">Origin: <span className="text-gray-100">{item.details.origin}</span></div>
                      </div>

                      {/* Voice pillar */}
                      <div className="p-4 rounded-xl bg-[#141414] border border-gray-800 space-y-2">
                        <div className="text-xs font-bold text-[#4F8CFF] flex items-center gap-1.5 pb-2 border-b border-gray-800">
                          <Mic className="w-4 h-4" /> VOICE BIOMETRICS
                        </div>
                        <div className="text-gray-300">AI Confidence: <span className="text-red-400">{item.details.aiVoiceConfidence}</span></div>
                        <div className="text-gray-300">Verdict: <span className="text-red-400">AI SYNTHETIC CONFIRMED</span></div>
                      </div>

                      {/* Mule pillar */}
                      <div className="p-4 rounded-xl bg-[#141414] border border-gray-800 space-y-2">
                        <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 pb-2 border-b border-gray-800">
                          <Building2 className="w-4 h-4" /> MULE VELOCITY
                        </div>
                        <div className="text-gray-300">Destination Account: <span className="text-amber-400">{item.details.muleAccountAge}</span></div>
                        <div className="text-gray-300">24h Transfers: <span className="text-red-400">{item.details.transfers24h} Transfers</span></div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="text-xs text-gray-400 font-mono">
                        Target Account: <span className="text-white font-bold">{item.targetAccount}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <button className="px-4 py-2 rounded-xl bg-gray-900 text-gray-300 border border-gray-700 text-xs font-bold font-mono hover:bg-gray-800">
                          EXPORT EVIDENCE DOSSIER
                        </button>
                        <button className="px-6 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold font-mono shadow-[0_0_15px_rgba(255,77,79,0.4)] flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5" /> FREEZE MULE NETWORK
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
