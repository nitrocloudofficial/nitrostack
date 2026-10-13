'use client';

import { useState } from 'react';
import { useCase } from '@/lib/case-context';
import { deriveStage } from '@/lib/utils';
import { CaseFileShell } from '@/components/CaseFileShell';
import { CaseStatusStepper } from '@/components/CaseStatusStepper';
import { TimelineRail, TimelineRailEmpty } from '@/components/TimelineRail';
import { VerificationRail } from '@/components/VerificationRail';
import { CaseSummaryHeader } from '@/components/CaseSummaryHeader';
import { Ledger } from '@/components/Ledger';
import { CoverageExplainerCard } from '@/components/CoverageExplainerCard';
import { InsurerActionPanel } from '@/components/InsurerActionPanel';
import { DocumentChecklist } from '@/components/DocumentChecklist';
import { LoanOffers } from '@/components/LoanOffers';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { StateCard } from '@/components/StateCard';
import { ProtectedPage } from '@/components/ProtectedPage';

type InsurerTab = 'submitted' | 'audit' | 'review' | 'decision';

function InsurerContent() {
  const { caseData, loading, error } = useCase();
  const [activeTab, setActiveTab] = useState<InsurerTab>('review');
  const [activeStepperStage, setActiveStepperStage] = useState<number | undefined>(undefined);

  const stage = deriveStage(caseData?.claimStatus);
  const hasFlags = (caseData?.objectivityReport.flags.length ?? 0) > 0;

  function handleStepperStageSelect(stageNumber: number) {
    setActiveStepperStage(stageNumber);
    if (stageNumber === 1) setActiveTab('submitted');
    else if (stageNumber === 2) setActiveTab('audit');
    else if (stageNumber === 3) setActiveTab('review');
    else if (stageNumber === 4) setActiveTab('decision');
  }

  const timeline = caseData ? (
    <TimelineRail events={caseData.timeline} />
  ) : (
    <TimelineRailEmpty message="No case pending review — claims appear when submitted by a hospital." />
  );

  const rightRail = caseData ? (
    <div className="space-y-4">
      <VerificationRail
        items={[
          { context: 'Hospital estimate', status: 'verified', verb: 'Verified', label: 'CGHS rate list' },
          { context: 'Coverage exclusions', status: 'verified', verb: 'Cross-checked', label: 'policy terms' },
          {
            context: 'Objectivity check',
            status: 'verified',
            verb: 'Verified',
            label: hasFlags ? 'flags raised — see audit' : 'no discrepancies',
          },
        ]}
      />
      <InsurerActionPanel key={caseData.caseId} />
    </div>
  ) : (
    <div className="glass rounded-2xl p-5 space-y-3">
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
        Verification Status
      </h2>
      <p className="text-xs text-slate-500 leading-relaxed">
        Once a case is submitted and verified, source stamps and action options appear here.
      </p>
    </div>
  );

  return (
    <CaseFileShell
      role="Insurer"
      roleTone="slate"
      stepper={
        <CaseStatusStepper
          stage={stage}
          activeSelectedStage={activeStepperStage}
          onSelectStage={handleStepperStageSelect}
        />
      }
      timeline={timeline}
      right={rightRail}
    >
      {loading && !caseData && !error && (
        <StateCard title="Loading Review Queue…" description="Pulling latest claim details from the backend." />
      )}

      {error && <StateCard tone="amber" title="Case Not Found" description={error} />}

      {!loading && !error && !caseData && (
        <StateCard
          title="No Pending Claims in Queue"
          description="Cases appear here automatically once submitted from the Hospital view."
        />
      )}

      {caseData && (
        <>
          <CaseSummaryHeader caseData={caseData} />

          {/* Functional Stage Navigation Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-white/50 bg-white/35 backdrop-blur-md p-1.5">
            <button
              type="button"
              onClick={() => {
                setActiveTab('submitted');
                setActiveStepperStage(1);
              }}
              className={`flex-1 min-w-max rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                activeTab === 'submitted'
                  ? 'bg-slate-900/80 backdrop-blur-md text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              📄 1. Submitted Intake & Docs
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('audit');
                setActiveStepperStage(2);
              }}
              className={`flex-1 min-w-max rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                activeTab === 'audit'
                  ? 'bg-slate-900/80 backdrop-blur-md text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              🛡️ 2. Rate Audit {hasFlags && '(⚠️ Flags)'}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('review');
                setActiveStepperStage(3);
              }}
              className={`flex-1 min-w-max rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                activeTab === 'review'
                  ? 'bg-slate-900/80 backdrop-blur-md text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              ✏️ 3. Insurer Adjudication & Policy
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('decision');
                setActiveStepperStage(4);
              }}
              className={`flex-1 min-w-max rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                activeTab === 'decision'
                  ? 'bg-slate-900/80 backdrop-blur-md text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              💳 4. Final Ledger & Gap Financing
            </button>
          </div>

          {/* Tab 1: Submitted Case & Intake Documents */}
          {activeTab === 'submitted' && (
            <div className="space-y-6 animate-route-in">
              <Card>
                <CardHeader
                  title="Submitted Intake & Medical Documents"
                  subtitle={`Claim submitted by ${caseData.hospitalName}`}
                />
                <CardBody className="space-y-4">
                  <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-xl border border-white/50 bg-white/30 backdrop-blur-md p-4">
                    <div>
                      <dt className="text-xs font-bold uppercase text-slate-400">Patient Name</dt>
                      <dd className="mt-0.5 text-sm font-bold text-slate-900">{caseData.patientName}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold uppercase text-slate-400">Hospital Facility</dt>
                      <dd className="mt-0.5 text-sm font-bold text-slate-900">{caseData.hospitalName}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold uppercase text-slate-400">Procedure</dt>
                      <dd className="mt-0.5 text-sm font-bold text-slate-900">{caseData.procedure}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold uppercase text-slate-400">Submitted Estimate</dt>
                      <dd className="mt-0.5 font-mono text-base font-bold text-slate-900">
                        ₹{caseData.hospitalEstimate.toLocaleString('en-IN')}
                      </dd>
                    </div>
                  </dl>

                  <DocumentChecklist caseId={caseData.caseId} />
                </CardBody>
              </Card>
            </div>
          )}

          {/* Tab 2: Objectivity Rate Audit */}
          {activeTab === 'audit' && (
            <div className="space-y-6 animate-route-in">
              <Card className={hasFlags ? 'outline outline-1 -outline-offset-1 outline-amber-300/50' : 'outline outline-1 -outline-offset-1 outline-teal-300/50'}>
                <CardHeader
                  title="Automated Objectivity Rate Audit Report"
                  subtitle={
                    hasFlags
                      ? 'Discrepancies identified during pre-review check'
                      : 'Zero discrepancies identified during pre-review check'
                  }
                />
                <CardBody className="space-y-4">
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                    {caseData.objectivityReport.summary}
                  </p>
                  {hasFlags ? (
                    <ul className="space-y-2">
                      {caseData.objectivityReport.flags.map((flag) => (
                        <li
                          key={flag}
                          className="flex items-start gap-2.5 rounded-xl border border-amber-300/40 bg-amber-400/10 backdrop-blur-md p-3 text-xs text-amber-900 font-medium"
                        >
                          <span className="mt-0.5 text-amber-600">⚠️</span>
                          <span>{flag}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="flex items-center gap-2 rounded-xl border border-teal-300/40 bg-teal-500/10 backdrop-blur-md p-3 text-xs text-teal-900 font-semibold">
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-teal-600 text-white font-bold text-[10px]">✓</span>
                      Consistent across hospital records, diagnosis codes, and CGHS policy terms.
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>
          )}

          {/* Tab 3: Insurer Adjudication & Policy Coverage */}
          {activeTab === 'review' && (
            <div className="space-y-6 animate-route-in">
              <CoverageExplainerCard coverageExplainer={caseData.coverageExplainer} />
            </div>
          )}

          {/* Tab 4: Final Ledger & Gap Financing */}
          {activeTab === 'decision' && (
            <div className="space-y-6 animate-route-in">
              <Ledger
                hospitalEstimate={caseData.hospitalEstimate}
                insurerApproved={caseData.insurerApproved}
                gap={caseData.gap}
                claimStatus={caseData.claimStatus}
              />
              <LoanOffers
                offers={caseData.loanOffers}
                recommendedOffer={caseData.recommendedOffer}
              />
            </div>
          )}
        </>
      )}
    </CaseFileShell>
  );
}

export default function InsurerPage() {
  return (
    <ProtectedPage requiredRole="insurer">
      <InsurerContent />
    </ProtectedPage>
  );
}
