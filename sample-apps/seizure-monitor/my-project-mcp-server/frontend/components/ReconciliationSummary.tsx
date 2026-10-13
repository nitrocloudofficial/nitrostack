'use client';

import type { ReconcileCaseResult } from '@/lib/types';
import { PROCEDURE_LABELS } from '@/lib/types';
import { formatINR } from '@/lib/utils';
import { StatusBadge, ConsistencyBadge } from '@/components/Badges';

export function ReconciliationSummary({
  data,
  roleLabel,
}: {
  data: ReconcileCaseResult;
  roleLabel: string;
}) {
  const procedureName = PROCEDURE_LABELS[data.procedureCode] || data.procedureCode;
  const approvedAmount = data.insurerClaim?.approvedAmount ?? 0;
  const cghsDiff = data.cghsBenchmark ? data.hospitalBilledAmount - data.cghsBenchmark : 0;

  return (
    <div className="mb-8 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-card">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-bold text-white tracking-wide">
              {data.patientId}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {data.city} • {roleLabel} View
            </span>
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {procedureName}
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 font-mono">
            Code: {data.procedureCode} | Single Shared Record (`reconcile_case`)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ConsistencyBadge isConsistent={data.isConsistent} />
          {data.insurerClaim && <StatusBadge status={data.insurerClaim.cashlessStatus} />}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Hospital Billed</p>
          <p className="mt-1 font-display text-2xl font-bold text-slate-900">{formatINR(data.hospitalBilledAmount)}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">Gross hospital charge</p>
        </div>

        <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">CGHS Govt Rate</p>
          <p className="mt-1 font-display text-2xl font-bold text-brand-700">
            {data.cghsBenchmark ? formatINR(data.cghsBenchmark) : 'N/A'}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {cghsDiff > 0 ? `+${formatINR(cghsDiff)} vs rate` : 'At CGHS benchmark'}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Insurer Approved</p>
          <p className="mt-1 font-display text-2xl font-bold text-emerald-700">
            {data.insurerClaim?.cashlessStatus === 'approved'
              ? formatINR(approvedAmount)
              : data.insurerClaim?.cashlessStatus === 'pending'
                ? 'Pending'
                : formatINR(0)}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {data.insurerClaim?.claimId ? `Claim: ${data.insurerClaim.claimId}` : 'No claim'}
          </p>
        </div>

        <div className={`rounded-xl p-4 border ${data.coverageGap > 0 ? 'bg-rose-50/60 border-rose-200' : 'bg-emerald-50/60 border-emerald-200'}`}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Coverage Gap</p>
          <p className={`mt-1 font-display text-2xl font-bold ${data.coverageGap > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
            {formatINR(data.coverageGap)}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-600">
            {data.financingNeeded ? 'Financing recommended' : 'Fully covered'}
          </p>
        </div>
      </div>

      {data.inconsistencies && data.inconsistencies.length > 0 && (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
          <div className="flex items-center gap-2 text-amber-900 font-semibold text-xs uppercase tracking-wider mb-2">
            <span>⚠️</span> Case Discrepancies & Audit Flags ({data.inconsistencies.length})
          </div>
          <ul className="space-y-1.5 pl-2">
            {data.inconsistencies.map((inc, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-amber-950">
                <span className="mt-0.5 text-amber-600 font-bold">•</span>
                <span>{inc}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
