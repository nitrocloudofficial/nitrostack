'use client';

import { useState } from 'react';
import type { ReconcileCaseResult, LoanOffer } from '@/lib/types';
import { formatINR } from '@/lib/utils';
import { SectionCard, AlertBanner } from '@/components/Cards';
import { PredatoryBadge } from '@/components/Badges';

export function PatientView({ data }: { data: ReconcileCaseResult }) {
  const [selectedOffer, setSelectedOffer] = useState<LoanOffer | null>(
    data.financingOptions?.[0] ?? null
  );

  const approved = data.insurerClaim?.approvedAmount ?? 0;
  const gap = data.coverageGap;
  const cghs = data.cghsBenchmark ?? 0;
  const billed = data.hospitalBilledAmount;
  const cghsDiff = Math.max(0, billed - cghs);

  return (
    <div className="space-y-6">
      {/* Patient Financial Summary Card */}
      <div className="rounded-2xl border border-brand-200/80 bg-gradient-to-br from-brand-50/50 via-white to-slate-50 p-6 shadow-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-brand-100/80 pb-5">
          <div>
            <span className="inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">
              Patient Out-of-Pocket Advisor
            </span>
            <h2 className="mt-2 font-display text-2xl font-bold text-slate-900">
              {gap > 0 ? `Out-of-Pocket Coverage Gap: ${formatINR(gap)}` : 'Full Coverage Approved'}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {gap > 0
                ? 'Your insurance payout does not fully cover the hospital bill. Below are verified financing choices.'
                : 'Congratulations! Your cashless claim fully covers the hospital bill.'}
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Net Exposure</p>
            <p className={`font-display text-3xl font-extrabold ${gap > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {formatINR(gap)}
            </p>
          </div>
        </div>

        {/* Fair Rate Advice */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200/70 bg-white p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Government CGHS Benchmark</p>
            <p className="mt-1 font-display text-xl font-bold text-slate-900">
              {cghs ? formatINR(cghs) : 'N/A'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {cghsDiff > 0
                ? `Hospital billed ₹${cghsDiff.toLocaleString()} extra above government tariff standard.`
                : 'Hospital bill matches standard CGHS benchmark.'}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200/70 bg-white p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Insurance Claim Payout</p>
            <p className="mt-1 font-display text-xl font-bold text-emerald-700">
              {formatINR(approved)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {data.insurerClaim?.cashlessStatus === 'denied'
                ? `Claim denied: ${data.insurerClaim.denialReason || 'Pre-existing clause'}`
                : 'Approved reimbursement amount.'}
            </p>
          </div>
        </div>
      </div>

      {/* Financing Options & Predatory Warning */}
      {data.financingNeeded && data.financingOptions && data.financingOptions.length > 0 && (
        <SectionCard
          title="Verified Healthcare Financing & Loan Offers"
          description="Sorted by true Effective Annual Rate (EAR). Look out for flagged predatory rates."
        >
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              {data.financingOptions.map((offer) => {
                const isSelected = selectedOffer?.offerId === offer.offerId;
                const monthlyEmi = Math.round(offer.totalRepayable / offer.tenureMonths);

                return (
                  <div
                    key={offer.offerId}
                    onClick={() => setSelectedOffer(offer)}
                    className={`relative cursor-pointer rounded-2xl border p-5 transition-all ${
                      offer.isPredatory
                        ? 'border-rose-300 bg-rose-50/40 hover:border-rose-400'
                        : isSelected
                          ? 'border-brand-500 bg-brand-50/50 shadow-md ring-2 ring-brand-300'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    {offer.isPredatory && (
                      <div className="mb-2">
                        <PredatoryBadge />
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <p className="font-bold text-slate-900">{offer.lenderName}</p>
                      <span className="text-xs font-mono text-slate-400">{offer.offerId}</span>
                    </div>

                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-xs text-slate-600">
                        <span>True Effective Rate (EAR):</span>
                        <span className={`font-bold ${offer.isPredatory ? 'text-rose-700 text-sm' : 'text-slate-900'}`}>
                          {(offer.effectiveAnnualRate * 100).toFixed(1)}% p.a.
                        </span>
                      </div>

                      <div className="flex justify-between text-xs text-slate-500">
                        <span>Advertised Flat Rate:</span>
                        <span>{(offer.flatInterestRate * 100).toFixed(1)}%</span>
                      </div>

                      <div className="flex justify-between text-xs text-slate-500">
                        <span>Tenure:</span>
                        <span>{offer.tenureMonths} Months</span>
                      </div>

                      <div className="flex justify-between text-xs text-slate-500">
                        <span>Processing Fee:</span>
                        <span>{(offer.processingFeePct * 100).toFixed(1)}%</span>
                      </div>
                    </div>

                    <div className="mt-4 border-t border-slate-100 pt-3">
                      <div className="flex justify-between items-baseline">
                        <span className="text-[11px] uppercase font-semibold text-slate-500">Monthly EMI</span>
                        <span className="font-display text-lg font-bold text-slate-900">
                          {formatINR(monthlyEmi)}/mo
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Total repayable: {formatINR(offer.totalRepayable)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Predatory Lender Alert Banner */}
            {data.financingOptions.some((o) => o.isPredatory) && (
              <AlertBanner
                variant="error"
                title="⚠️ PREDATORY LENDER WARNING DETECTED"
              >
                Our objective rate analyzer flagged high-risk lenders (e.g. <strong>QuickMed Credit</strong>) charging misleading flat rates. While they advertise 32% flat interest, their <strong>TRUE Effective Annual Rate (EAR) is ~37% + 5% processing fee</strong>. We recommend selecting lower EAR options like <strong>CareFund Finance</strong> or <strong>TrustHealth Loans</strong>.
              </AlertBanner>
            )}

            {/* Selected Offer Detail Card */}
            {selectedOffer && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900">{selectedOffer.lenderName} — Application Breakdown</h3>
                    <p className="text-xs text-slate-600">
                      Loan Principal: {formatINR(selectedOffer.principal)} over {selectedOffer.tenureMonths} months
                    </p>
                  </div>
                  <button type="button" className="btn-primary py-2 text-xs">
                    Apply for {selectedOffer.lenderName} Loan
                  </button>
                </div>
              </div>
            )}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
