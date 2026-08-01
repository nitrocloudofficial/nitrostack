import React, { useState } from 'react';
import { ShieldCheck, FileText, CheckCircle2, AlertTriangle, Building2, Globe } from 'lucide-react';
import { COMPLIANCE_RULES, SUPPORTED_COUNTRIES } from '../utils/constants';

export const Compliance: React.FC = () => {
  const [selectedCountry, setSelectedCountry] = useState('IN');
  const rule = COMPLIANCE_RULES[selectedCountry] || COMPLIANCE_RULES['IN'];

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 font-bold text-xs border border-emerald-500/20">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>REGULATORY & COMPLIANCE INTELLIGENCE</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Country Compliance Profiles
        </h1>
        <p className="text-sm text-slate-500 max-w-xl mx-auto">
          Pre-verify KYC requirements, mandatory identity documents, and AML daily transaction caps.
        </p>
      </div>

      {/* COUNTRY SELECTOR TABS */}
      <div className="flex items-center justify-center gap-2 overflow-x-auto p-1.5 rounded-2xl glass-card border border-slate-200 dark:border-slate-800">
        {SUPPORTED_COUNTRIES.slice(0, 6).map((c) => (
          <button
            key={c.code}
            onClick={() => setSelectedCountry(c.code)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              selectedCountry === c.code
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>{c.flag}</span>
            <span>{c.name}</span>
          </button>
        ))}
      </div>

      {/* COUNTRY PROFILE DETAILS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Regulatory Info */}
        <div className="md:col-span-2 glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{rule.flag}</span>
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">{rule.countryName}</h2>
                <span className="text-xs text-slate-500 font-mono">Regulatory Framework: {rule.regulatoryBody}</span>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              Risk Level: {rule.riskLevel}
            </span>
          </div>

          {/* REQUIRED DOCUMENTS CHECKLIST */}
          <div className="space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" />
              <span>Required Identity Documents Checklist</span>
            </h3>

            <div className="space-y-3">
              {rule.requiredDocuments.map((doc, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-start gap-3"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{doc.name}</span>
                      {doc.mandatory && (
                        <span className="text-[10px] uppercase font-bold text-rose-500 bg-rose-500/10 px-2 py-0.2 rounded-md">
                          Mandatory
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{doc.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* STATS & WARNINGS */}
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
              AML & Daily Limits
            </h3>

            <div className="space-y-3 text-xs font-mono">
              <div className="flex justify-between p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                <span className="text-slate-500 font-sans">KYC Required:</span>
                <span className="font-bold text-emerald-500">YES</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                <span className="text-slate-500 font-sans">Sanctions Screening:</span>
                <span className="font-bold text-emerald-500">ACTIVE</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                <span className="text-slate-500 font-sans">Max Daily Limit:</span>
                <span className="font-bold text-blue-500">${rule.maxDailyLimit.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-2 text-amber-700 dark:text-amber-300">
            <div className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Regulatory Notice</span>
            </div>
            <p className="leading-relaxed text-[11px]">{rule.notes}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
