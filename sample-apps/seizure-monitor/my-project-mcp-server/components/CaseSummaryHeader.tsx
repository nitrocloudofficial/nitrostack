import type { ReactNode } from 'react';
import { formatDateTime } from '@/lib/utils';
import type { CaseData } from '@/lib/types';

export function CaseSummaryHeader({
  caseData,
  action,
}: {
  caseData: CaseData;
  action?: ReactNode;
}) {
  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/40 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-500">
              Case Reference
            </span>
            <span className="rounded-md bg-white/40 backdrop-blur-md font-mono text-xs font-bold px-2 py-0.5 text-slate-800">
              {caseData.caseId}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900 tracking-tight sm:text-3xl">
            {caseData.patientName}
          </h1>
        </div>
        {action}
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="glass-soft rounded-xl p-3">
          <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Hospital Facility
          </dt>
          <dd className="mt-0.5 text-xs sm:text-sm font-semibold text-slate-900">{caseData.hospitalName}</dd>
        </div>
        <div className="glass-soft rounded-xl p-3">
          <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Medical Procedure
          </dt>
          <dd className="mt-0.5 text-xs sm:text-sm font-semibold text-slate-900">{caseData.procedure}</dd>
        </div>
        <div className="glass-soft rounded-xl p-3">
          <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Date Submitted
          </dt>
          <dd className="mt-0.5 font-mono text-xs font-semibold text-slate-800">
            {formatDateTime(caseData.submittedAt)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
