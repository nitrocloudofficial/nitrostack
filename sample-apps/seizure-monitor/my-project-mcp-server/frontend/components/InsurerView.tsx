'use client';

import type { ReconcileCaseResult } from '@/lib/types';
import { formatINR } from '@/lib/utils';
import { SectionCard, AlertBanner } from '@/components/Cards';
import { StatusBadge } from '@/components/Badges';
import { PolicyDecoderModal } from '@/components/PolicyDecoderModal';

export function InsurerView({ data }: { data: ReconcileCaseResult }) {
  const claim = data.insurerClaim;
  const approvedAmount = claim?.approvedAmount ?? 0;
  const billed = data.hospitalBilledAmount;
  const cghs = data.cghsBenchmark ?? 0;

  return (
    <div className="space-y-6">
      {/* Adjudication Overview */}
      <SectionCard
        title="Insurer Claim Adjudication Audit"
        description="Objective reconciliation audit log derived from hospital bill, CGHS rates, and insurance policy rules."
        action={claim && <StatusBadge status={claim.cashlessStatus} />}
      >
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Claim Reference</p>
              <p className="mt-1 font-mono text-lg font-bold text-slate-900">{claim?.claimId || 'N/A'}</p>
              <p className="mt-0.5 text-xs text-slate-500">Patient: {data.patientId}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Adjudicated Payout</p>
              <p className="mt-1 font-display text-lg font-bold text-emerald-700">
                {claim?.cashlessStatus === 'approved'
                  ? formatINR(approvedAmount)
                  : claim?.cashlessStatus === 'pending'
                    ? 'Pending Review'
                    : '₹0 (Denied)'}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">Requested: {formatINR(billed)}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Network Hospital Check</p>
              <p className="mt-1 font-display text-lg font-bold text-slate-900">
                {claim?.isNetworkHospital !== false ? 'In-Network ✅' : 'Non-Network ⚠️'}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">Tariff audit required</p>
            </div>
          </div>

          {claim?.cashlessStatus === 'denied' && (
            <AlertBanner
              variant="error"
              title={`Claim Denied: ${claim.denialReason || 'Policy exclusion active'}`}
            >
              The cashless request for Patient {data.patientId} was rejected by underwriting rules. The objective mediator has created a coverage gap of {formatINR(data.coverageGap)}.
            </AlertBanner>
          )}

          {claim?.cashlessStatus === 'pending' && (
            <AlertBanner
              variant="warning"
              title="Claim Under Pre-Authorization Review"
            >
              Cashless approval is currently pending documents or hospital network audit.
            </AlertBanner>
          )}

          {/* Audit Verification Checklist */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">
              Reconciliation Audit Checklist
            </h4>
            <div className="grid gap-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                <span className="text-slate-700">CGHS Tariff Compliance</span>
                <span className="font-semibold text-slate-900">
                  {cghs > 0 && billed <= cghs ? '✅ Within Tariff Ceiling' : `⚠️ Excess ₹${(billed - cghs).toLocaleString()}`}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                <span className="text-slate-700">Hospital Network Provider</span>
                <span className="font-semibold text-slate-900">
                  {claim?.isNetworkHospital !== false ? '✅ Partner Provider' : '⚠️ Out-of-network provider'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                <span className="text-slate-700">Case Consistency Flag</span>
                <span className="font-semibold text-slate-900">
                  {data.isConsistent ? '✅ Consistent Data' : '⚠️ Inconsistencies Detected'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Integrated Policy Decoder */}
      <PolicyDecoderModal />
    </div>
  );
}
