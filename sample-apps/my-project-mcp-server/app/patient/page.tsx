'use client';

import { useState } from 'react';
import { useCase } from '@/lib/case-context';
import { deriveStage } from '@/lib/utils';
import { CaseFileShell } from '@/components/CaseFileShell';
import { CaseStatusStepper } from '@/components/CaseStatusStepper';
import { CaseNotificationBanner } from '@/components/CaseNotificationBanner';
import { TimelineRail, TimelineRailEmpty } from '@/components/TimelineRail';
import { VerificationRail } from '@/components/VerificationRail';
import { CaseSummaryHeader } from '@/components/CaseSummaryHeader';
import { PrintButton } from '@/components/PrintButton';
import { CompletenessChecklist } from '@/components/CompletenessChecklist';
import { DocumentChecklist, DOCUMENT_IDS } from '@/components/DocumentChecklist';
import type { DocumentId } from '@/lib/types';
import { Ledger } from '@/components/Ledger';
import { CoverageExplainerCard } from '@/components/CoverageExplainerCard';
import { LoanOffers } from '@/components/LoanOffers';
import { ComparisonTray } from '@/components/ComparisonTray';
import { ReportIssueModal } from '@/components/ReportIssueModal';
import { VerificationStamp } from '@/components/VerificationStamp';
import { StateCard } from '@/components/StateCard';
import { formatDateTime } from '@/lib/utils';
import { ProtectedPage } from '@/components/ProtectedPage';

type ActiveSectionTab = 'overview' | 'coverage' | 'documents' | 'financing';

function PatientContent() {
  const { caseData, loading, error } = useCase();
  const [uploadedDocs, setUploadedDocs] = useState<DocumentId[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveSectionTab>('overview');
  const [activeStepperStage, setActiveStepperStage] = useState<number | undefined>(undefined);

  const stage = deriveStage(caseData?.claimStatus);

  function handleStepperStageSelect(stageNumber: number) {
    setActiveStepperStage(stageNumber);
    if (stageNumber === 1) setActiveTab('documents');
    else if (stageNumber === 2) setActiveTab('coverage');
    else if (stageNumber === 3) setActiveTab('overview');
    else if (stageNumber === 4) setActiveTab('financing');
  }

  const timeline = caseData ? (
    <TimelineRail events={caseData.timeline} />
  ) : (
    <TimelineRailEmpty message="No case loaded — start by submitting details in Hospital view." />
  );

  const rightRail = caseData ? (
    <>
      <VerificationRail
        items={[
          { context: 'Hospital estimate', status: 'verified', verb: 'Verified', label: 'CGHS rate list' },
          { context: 'Coverage exclusions', status: 'verified', verb: 'Cross-checked', label: 'policy terms' },
          {
            context: 'Recommended financing',
            status: 'verified',
            verb: 'Verified',
            label: 'lowest true cost',
          },
          ...(caseData.loanOffers.some((o) => o.flagged)
            ? [{ context: 'Flagged financing offer', status: 'pending' as const }]
            : []),
        ]}
      />
      <ComparisonTray />
    </>
  ) : (
    <div className="glass rounded-2xl p-5 space-y-3">
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
        Verification Panel
      </h2>
      <p className="text-xs text-slate-500 leading-relaxed">
        Verified source stamps and policy comparison tools render automatically once a case is submitted.
      </p>
    </div>
  );

  const documentsComplete = uploadedDocs.length === DOCUMENT_IDS.length;

  const consentEvent = caseData?.timeline.find(
    (e) => e.actor === 'patient' || e.event.toLowerCase().includes('consent')
  );

  return (
    <CaseFileShell
      role="Patient"
      roleTone="verified"
      stepper={
        <CaseStatusStepper
          stage={stage}
          activeSelectedStage={activeStepperStage}
          onSelectStage={handleStepperStageSelect}
        />
      }
      notification={<CaseNotificationBanner />}
      timeline={timeline}
      right={rightRail}
    >
      {loading && !caseData && !error && (
        <StateCard title="Loading Case…" description="Fetching latest case record from the shared ledger." />
      )}

      {error && (
        <StateCard
          tone="amber"
          title="Case Not Found"
          description={error}
        />
      )}

      {!loading && !error && !caseData && (
        <StateCard
          title="No Active Case Loaded"
          description="Submit patient details from the Hospital view to explore the live shared record."
        />
      )}

      {caseData && (
        <>
          <CaseSummaryHeader caseData={caseData} action={<PrintButton />} />

          {/* Clean Section Navigation Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-white/50 bg-white/35 backdrop-blur-md p-1.5">
            <button
              type="button"
              onClick={() => {
                setActiveTab('overview');
                setActiveStepperStage(3);
              }}
              className={`flex-1 min-w-max rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === 'overview'
                  ? 'bg-teal-600/85 backdrop-blur-md text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              📊 Overview & Cost Breakdown
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('coverage');
                setActiveStepperStage(2);
              }}
              className={`flex-1 min-w-max rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === 'coverage'
                  ? 'bg-teal-600/85 backdrop-blur-md text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              🛡️ Policy & Exclusions
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('documents');
                setActiveStepperStage(1);
              }}
              className={`flex-1 min-w-max rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === 'documents'
                  ? 'bg-teal-600/85 backdrop-blur-md text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              📁 Documents & Consent ({uploadedDocs.length}/{DOCUMENT_IDS.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('financing');
                setActiveStepperStage(4);
              }}
              className={`flex-1 min-w-max rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === 'financing'
                  ? 'bg-teal-600/85 backdrop-blur-md text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              💳 Payment Plans
            </button>
          </div>

          {/* Section 1: Overview & Cost Ledger */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-route-in">
              <Ledger
                hospitalEstimate={caseData.hospitalEstimate}
                insurerApproved={caseData.insurerApproved}
                gap={caseData.gap}
                claimStatus={caseData.claimStatus}
              />

              <CompletenessChecklist
                items={[
                  { label: 'All required documents uploaded', done: documentsComplete },
                  { label: 'Patient consent recorded', done: true },
                  {
                    label: 'No unresolved objectivity flags',
                    done: caseData.objectivityReport.flags.length === 0,
                  },
                  {
                    label: 'Insurance provider details confirmed',
                    done: caseData.coverageExplainer.networkStatus !== 'unknown',
                  },
                ]}
              />

              <div className="glass flex items-center justify-between rounded-2xl p-4">
                <div className="text-xs">
                  <p className="font-bold text-slate-900">Need help or wish to dispute a finding?</p>
                  <p className="text-slate-500">Report an issue directly to the insurer and grievance officer.</p>
                </div>
                <ReportIssueModal caseId={caseData.caseId} />
              </div>
            </div>
          )}

          {/* Section 2: Policy Coverage */}
          {activeTab === 'coverage' && (
            <div className="space-y-6 animate-route-in">
              <CoverageExplainerCard coverageExplainer={caseData.coverageExplainer} />
            </div>
          )}

          {/* Section 3: Documents & Consent */}
          {activeTab === 'documents' && (
            <div className="space-y-6 animate-route-in">
              {/* Consent Record Card */}
              <div className="rounded-2xl border border-teal-300/40 bg-white/45 backdrop-blur-xl p-5 shadow-lg shadow-teal-900/5">
                <div className="flex items-center justify-between border-b border-white/40 pb-3">
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-teal-800">
                      Consent Record
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">Digital authorization on record</p>
                  </div>
                  <VerificationStamp status="verified" verb="Verified" label="patient authorization on file" compact />
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Authorized By</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-900">{caseData.patientName}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Timestamp</p>
                    <p className="mt-0.5 font-mono text-xs font-semibold text-slate-800">
                      {consentEvent ? formatDateTime(consentEvent.timestamp) : formatDateTime(caseData.submittedAt)}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Scope of Sharing</p>
                    <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">
                      Patient authorized sharing medical records, cost estimates, and billing details with{' '}
                      <strong className="text-slate-800">
                        {caseData.coverageExplainer.networkStatus !== 'unknown'
                          ? 'the listed insurer'
                          : 'the insurer on record'}
                      </strong>{' '}
                      for processing this claim.
                    </p>
                  </div>
                </div>
              </div>

              <DocumentChecklist caseId={caseData.caseId} onChange={setUploadedDocs} />
            </div>
          )}

          {/* Section 4: Financing & Payment Plans */}
          {activeTab === 'financing' && (
            <div className="space-y-6 animate-route-in">
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

export default function PatientPage() {
  return (
    <ProtectedPage requiredRole="patient">
      <PatientContent />
    </ProtectedPage>
  );
}
