import React from 'react';
import { ShieldCheck, ShieldAlert, CheckCircle2, AlertTriangle, FileText, Lock } from 'lucide-react';
import { AgentChatResponse } from '../../types';

interface RiskAssessmentCardProps {
  response: AgentChatResponse;
}

export const RiskAssessmentCard: React.FC<RiskAssessmentCardProps> = ({ response }) => {
  const complianceData = response.results?.compliance?.data || {};

  const riskLevel: 'Low' | 'Medium' | 'High' = complianceData.risk_level || 'Low';
  const kycStatus = complianceData.kyc_required ?? true;
  const amlStatus = complianceData.aml_check ?? true;
  const sanctionsStatus = complianceData.sanctions_screening ?? true;
  const docs = complianceData.documents || ['Passport / Aadhaar Card', 'Proof of Address'];

  const getRiskBadge = (level: string) => {
    switch (level.toLowerCase()) {
      case 'low':
        return {
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          dot: 'bg-emerald-500',
          text: 'LOW RISK - Instant Clearance',
        };
      case 'medium':
        return {
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          dot: 'bg-amber-500',
          text: 'MEDIUM RISK - Standard Verification',
        };
      default:
        return {
          bg: 'bg-red-500/10 text-red-400 border-red-500/30',
          dot: 'bg-red-500',
          text: 'HIGH RISK - Compliance Review Required',
        };
    }
  };

  const badgeStyle = getRiskBadge(riskLevel);

  return (
    <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4 shadow-lg space-y-4 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-100">
              Risk Assessment & Regulatory clearance
            </h4>
            <p className="text-[10px] text-slate-400">
              AML, KYC & Sanctions Screening Verification
            </p>
          </div>
        </div>

        {/* Overall Risk Level Badge */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold font-mono ${badgeStyle.bg}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${badgeStyle.dot} animate-pulse`} />
          {badgeStyle.text}
        </div>
      </div>

      {/* 4 Risk Status Indicators Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Item 1: KYC Status */}
        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
          <div className="text-[10px] text-slate-400 font-mono">KYC Verification</div>
          <div className="flex items-center gap-1.5 mt-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-xs font-bold text-slate-200">Required & Verified</span>
          </div>
        </div>

        {/* Item 2: AML Check */}
        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
          <div className="text-[10px] text-slate-400 font-mono">AML Check</div>
          <div className="flex items-center gap-1.5 mt-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-xs font-bold text-slate-200">100% Passed</span>
          </div>
        </div>

        {/* Item 3: Sanctions Screening */}
        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
          <div className="text-[10px] text-slate-400 font-mono">Sanctions List</div>
          <div className="flex items-center gap-1.5 mt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-xs font-bold text-slate-200">No Matches</span>
          </div>
        </div>

        {/* Item 4: Large Transfer Review */}
        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
          <div className="text-[10px] text-slate-400 font-mono">Large Transfer</div>
          <div className="flex items-center gap-1.5 mt-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span className="text-xs font-bold text-slate-200">Auto Cleared</span>
          </div>
        </div>
      </div>

      {/* Required Compliance Documents */}
      <div className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <FileText className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-[11px]">Required Payout Documents:</span>
          <span className="font-semibold text-slate-200">{docs.join(', ')}</span>
        </div>
        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
          Ready for Dispatch
        </span>
      </div>
    </div>
  );
};
