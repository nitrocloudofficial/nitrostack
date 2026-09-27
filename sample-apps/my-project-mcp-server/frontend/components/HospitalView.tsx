'use client';

import { useState } from 'react';
import type { ReconcileCaseResult, CityProcedure } from '@/lib/types';
import { formatINR } from '@/lib/utils';
import { SectionCard, AlertBanner } from '@/components/Cards';
import { fetchCityProcedures } from '@/lib/actions';

export function HospitalView({ data }: { data: ReconcileCaseResult }) {
  const [cityLookup, setCityLookup] = useState(data.city);
  const [cityProcedures, setCityProcedures] = useState<CityProcedure[] | null>(null);
  const [loadingProcedures, setLoadingProcedures] = useState(false);

  const cghs = data.cghsBenchmark ?? 0;
  const billed = data.hospitalBilledAmount;
  const approved = data.insurerClaim?.approvedAmount ?? 0;
  const overbilling = Math.max(0, billed - cghs);
  const maxVal = Math.max(billed, cghs, approved, 1);

  const handleLookup = async () => {
    setLoadingProcedures(true);
    const res = await fetchCityProcedures(cityLookup);
    setLoadingProcedures(false);
    if (res.data) {
      setCityProcedures(res.data);
    }
  };

  return (
    <div className="space-y-6">
      {/* Billing & Benchmark Comparison Visual */}
      <SectionCard
        title="Hospital Billing & CGHS Benchmark Analysis"
        description="Cross-referencing hospital quote against government CGHS tariff schedule for transparency."
      >
        <div className="space-y-5">
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Hospital Billed Amount</span>
                <span>{formatINR(billed)}</span>
              </div>
              <div className="h-4 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-slate-800 rounded-full transition-all duration-500"
                  style={{ width: `${(billed / maxVal) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>CGHS Benchmark Tariff ({data.city})</span>
                <span className="text-brand-700">{formatINR(cghs)}</span>
              </div>
              <div className="h-4 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-brand-600 rounded-full transition-all duration-500"
                  style={{ width: `${(cghs / maxVal) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Insurer Cashless Adjudicated</span>
                <span className="text-emerald-700">
                  {data.insurerClaim?.cashlessStatus === 'approved'
                    ? formatINR(approved)
                    : data.insurerClaim?.cashlessStatus === 'pending'
                      ? 'Under Review'
                      : '₹0 (Claim Denied)'}
                </span>
              </div>
              <div className="h-4 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      data.insurerClaim?.cashlessStatus === 'approved'
                        ? (approved / maxVal) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>

          {overbilling > 0 ? (
            <AlertBanner variant="warning" title={`Billed Tariff Exceeds CGHS Benchmark by ${formatINR(overbilling)}`}>
              The submitted bill is {Math.round((overbilling / cghs) * 100)}% above the standard CGHS rate for {data.city}. Insurers may require tariff justification or audit documentation before approving cashless overrides.
            </AlertBanner>
          ) : (
            <AlertBanner variant="info" title="Compliant Hospital Billing Tariff">
              The submitted hospital bill aligns strictly within standard CGHS ceiling limits. No tariff inflation flags detected.
            </AlertBanner>
          )}
        </div>
      </SectionCard>

      {/* Hospital Network & Claim Status */}
      <div className="grid gap-6 md:grid-cols-2">
        <SectionCard title="Insurer Pre-Auth & Network Status">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-sm font-medium text-slate-600">Claim ID</span>
              <span className="font-mono text-sm font-bold text-slate-900">
                {data.insurerClaim?.claimId || 'N/A'}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-sm font-medium text-slate-600">Cashless Status</span>
              <span className="text-sm font-bold uppercase tracking-wider text-slate-800">
                {data.insurerClaim?.cashlessStatus || 'Not submitted'}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-sm font-medium text-slate-600">Network Hospital Partner</span>
              <span className="text-sm font-bold text-slate-900">
                {data.insurerClaim?.isNetworkHospital !== false ? '✅ In-Network Partner' : '⚠️ Non-Network Hospital'}
              </span>
            </div>

            {data.insurerClaim?.denialReason && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
                <span className="font-bold">Denial Notice: </span>
                {data.insurerClaim.denialReason}
              </div>
            )}
          </div>
        </SectionCard>

        {/* City CGHS Rate Directory */}
        <SectionCard title="CGHS Rate Lookup Directory" description="Explore official CGHS rates for procedures across cities.">
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                className="input-field py-2 text-xs"
                value={cityLookup}
                onChange={(e) => setCityLookup(e.target.value)}
                placeholder="City name (e.g. Chennai, Delhi)"
              />
              <button
                type="button"
                onClick={handleLookup}
                disabled={loadingProcedures}
                className="btn-primary py-2 px-4 text-xs whitespace-nowrap"
              >
                {loadingProcedures ? 'Searching...' : 'Search Tariff'}
              </button>
            </div>

            {cityProcedures && (
              <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200 divide-y text-xs">
                {cityProcedures.map((p) => (
                  <div key={p.code} className="flex justify-between items-center p-2.5 bg-slate-50/50">
                    <div>
                      <p className="font-semibold text-slate-900">{p.procedure}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{p.code}</p>
                    </div>
                    <span className="font-bold text-brand-700">{formatINR(p.cghsRate)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
