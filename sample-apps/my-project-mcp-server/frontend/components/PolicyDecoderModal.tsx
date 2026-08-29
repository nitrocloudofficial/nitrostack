'use client';

import { useState } from 'react';
import { fetchPolicyDecoder } from '@/lib/actions';
import type { PolicyDecoderResult } from '@/lib/types';
import { SectionCard } from '@/components/Cards';

const SAMPLE_POLICIES = [
  {
    title: 'Pre-existing Exclusion Clause',
    text: 'Coverage for any pre-existing disease or condition specified in policy schedule is subject to a 36-month continuous waiting period from policy inception.',
  },
  {
    title: 'CGHS Benchmark Tariff Clause',
    text: 'Reimbursement of medical expenses for surgeries shall be capped at standard CGHS rates for Tier-1 cities. Expenses above CGHS rates require prior co-pay.',
  },
  {
    title: 'Room Rent Capping & Copay',
    text: 'Room rent is capped at 1% of sum insured per day. A mandatory co-payment of 15% applies to all non-network hospital admissions.',
  },
];

export function PolicyDecoderModal() {
  const [policyText, setPolicyText] = useState(SAMPLE_POLICIES[0].text);
  const [hospitalId, setHospitalId] = useState('HOSP-01');
  const [result, setResult] = useState<PolicyDecoderResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleDecode = async () => {
    if (!policyText.trim()) return;
    setLoading(true);
    const res = await fetchPolicyDecoder(policyText, hospitalId);
    setLoading(false);
    if (res.data) {
      setResult(res.data);
    }
  };

  return (
    <SectionCard
      title="📄 Policy Decoder Tool (`policy_decoder`)"
      description="Scan raw insurance policy text to extract plain-language explanations of fine print exclusions, waiting periods, and room caps."
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Quick Load Sample Clauses</label>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_POLICIES.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setPolicyText(sample.text);
                  setResult(null);
                }}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                {sample.title}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Raw Insurance Policy Document Text</label>
          <textarea
            className="input-field min-h-[100px] text-xs font-mono"
            rows={4}
            value={policyText}
            onChange={(e) => setPolicyText(e.target.value)}
            placeholder="Paste raw insurance policy text here..."
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            className="input-field max-w-xs text-xs py-2"
            value={hospitalId}
            onChange={(e) => setHospitalId(e.target.value)}
            placeholder="Hospital ID (optional)"
          />
          <button
            type="button"
            onClick={handleDecode}
            disabled={loading || !policyText}
            className="btn-primary py-2 px-5 text-xs"
          >
            {loading ? 'Decoding Policy...' : '🔍 Decode Policy Fine Print'}
          </button>
        </div>

        {result && (
          <div className="mt-5 rounded-2xl border border-brand-200 bg-brand-50/40 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-brand-100 pb-3">
              <div>
                <p className="font-bold text-slate-900 text-sm">Decoder Analysis Report</p>
                <p className="text-xs text-slate-600">{result.summary}</p>
              </div>
              <span className="rounded-full bg-brand-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                {result.clausesFound} Clauses Identified
              </span>
            </div>

            {result.hospitalNote && (
              <div className="rounded-lg bg-white p-2.5 text-xs font-medium text-slate-700 border border-brand-100">
                {result.hospitalNote}
              </div>
            )}

            <div className="space-y-3">
              {result.explanations.map((exp) => (
                <div
                  key={exp.id}
                  className={`rounded-xl border p-3 bg-white ${
                    exp.severity === 'danger'
                      ? 'border-rose-200 bg-rose-50/30'
                      : exp.severity === 'warning'
                        ? 'border-amber-200 bg-amber-50/30'
                        : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">{exp.title}</span>
                    <span className="font-mono text-[10px] uppercase font-semibold text-slate-500">
                      Keyword: &quot;{exp.matchedKeyword}&quot;
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-700 leading-relaxed">{exp.plainLanguage}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
