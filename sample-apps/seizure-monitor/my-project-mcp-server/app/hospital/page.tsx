'use client';

import { useState } from 'react';
import { useCase } from '@/lib/case-context';
import { createCase, runObjectivityCheck, uploadDocument, ApiError } from '@/lib/api';
import { CaseFileShell } from '@/components/CaseFileShell';
import { CaseStatusStepper } from '@/components/CaseStatusStepper';
import { CaseNotificationBanner } from '@/components/CaseNotificationBanner';
import { TimelineRail, TimelineRailEmpty } from '@/components/TimelineRail';
import { VerificationRail } from '@/components/VerificationRail';
import { CompletenessChecklist } from '@/components/CompletenessChecklist';
import { DocumentChecklist } from '@/components/DocumentChecklist';
import { VerificationStamp } from '@/components/VerificationStamp';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import type { CaseData, DocumentId } from '@/lib/types';
import { ProtectedPage } from '@/components/ProtectedPage';

type FileState = {
  file: File | null;
  uploaded: boolean;
};

function HospitalContent() {
  const { setCaseId, refreshCases } = useCase();
  
  // Comprehensive Form State
  const [form, setForm] = useState({
    patientName: '',
    patientId: '',
    hospitalName: '',
    department: '',
    procedure: '',
    procedureCode: '',
    patientHistory: '',
    insuranceProvider: '',
    policyId: '',
    estimatedCost: '',
  });

  // Inline Document Attachments State
  const [attachedFiles, setAttachedFiles] = useState<Record<DocumentId, FileState>>({
    'discharge-summary': { file: null, uploaded: false },
    'id-proof': { file: null, uploaded: false },
    'policy-document': { file: null, uploaded: false },
    'itemized-bill': { file: null, uploaded: false },
  });

  const [createdCase, setCreatedCase] = useState<CaseData | null>(null);
  const [uploadedDocsList, setUploadedDocsList] = useState<DocumentId[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleFileSelect(docId: DocumentId, file: File | null) {
    setAttachedFiles((prev) => ({
      ...prev,
      [docId]: { file, uploaded: false },
    }));
  }

  // 1-Click Auto-Fill Sample Data
  function handleAutoFill() {
    setForm({
      patientName: 'Meera Nair',
      patientId: 'AADHAAR-8839-4412',
      hospitalName: 'Sunrise General Hospital',
      department: 'General Surgery Ward 3B',
      procedure: 'Laparoscopic Appendectomy',
      procedureCode: 'ICD-10 K35.80 / CPT 44970',
      patientHistory: 'Patient presented with acute right lower quadrant abdominal pain, fever (38.5°C), and elevated WBC. Ultrasound confirmed acute appendicitis.',
      insuranceProvider: 'Star Health Insurance',
      policyId: 'POL-STAR-44912',
      estimatedCost: '185000',
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    try {
      // Step 1: Create Case in Ledger
      const created = await createCase({
        patientName: form.patientName,
        hospitalName: form.hospitalName,
        procedure: form.procedureCode ? `${form.procedure} (${form.procedureCode})` : form.procedure,
        patientHistory: `Patient ID: ${form.patientId || 'N/A'} | Policy: ${form.policyId || 'N/A'}\n${form.patientHistory}`,
        insuranceProvider: form.insuranceProvider,
        estimatedCost: Number(form.estimatedCost),
      });

      // Step 2: Upload any attached files inline
      const docUploadPromises: Promise<unknown>[] = [];
      const updatedDocs: DocumentId[] = [];

      for (const [docId, state] of Object.entries(attachedFiles)) {
        if (state.file) {
          docUploadPromises.push(uploadDocument(created.caseId, docId as DocumentId, state.file));
          updatedDocs.push(docId as DocumentId);
        }
      }
      if (docUploadPromises.length > 0) {
        await Promise.all(docUploadPromises);
      }

      // Step 3: Run Objectivity Rate Check
      const checked = await runObjectivityCheck(created.caseId);

      setCreatedCase(checked);
      setUploadedDocsList(updatedDocs);
      setCaseId(checked.caseId);
      refreshCases();
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : 'Could not submit the case. Please check form details and try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setForm({
      patientName: '',
      patientId: '',
      hospitalName: '',
      department: '',
      procedure: '',
      procedureCode: '',
      patientHistory: '',
      insuranceProvider: '',
      policyId: '',
      estimatedCost: '',
    });
    setAttachedFiles({
      'discharge-summary': { file: null, uploaded: false },
      'id-proof': { file: null, uploaded: false },
      'policy-document': { file: null, uploaded: false },
      'itemized-bill': { file: null, uploaded: false },
    });
    setCreatedCase(null);
    setUploadedDocsList([]);
    setSubmitError(null);
  }

  const patientDetailsComplete = Boolean(
    form.patientName.trim() &&
      form.hospitalName.trim() &&
      form.procedure.trim() &&
      form.insuranceProvider.trim()
  );
  const estimateProvided = Number(form.estimatedCost) > 0;
  const attachedFileCount = Object.values(attachedFiles).filter((f) => f.file !== null).length;
  const documentsComplete = uploadedDocsList.length > 0 || attachedFileCount > 0;
  const consentRecorded = createdCase !== null;

  const completenessItems = [
    { label: 'Patient & procedure details filled', done: patientDetailsComplete },
    { label: 'Cost estimate provided', done: estimateProvided },
    { label: 'Required documents attached/uploaded', done: documentsComplete },
    { label: 'Patient consent recorded', done: consentRecorded },
  ];

  const hasFlags = (createdCase?.objectivityReport.flags.length ?? 0) > 0;
  const consentEvent = createdCase?.timeline.find((e) => e.actor === 'patient');

  return (
    <CaseFileShell
      role="Hospital"
      roleTone="ink"
      stepper={<CaseStatusStepper stage={createdCase ? 1 : 0} />}
      notification={<CaseNotificationBanner />}
      timeline={
        createdCase ? (
          <TimelineRail events={createdCase.timeline} />
        ) : (
          <TimelineRailEmpty message="No case started yet — enter details and attach files below to submit a claim." />
        )
      }
      right={
        createdCase ? (
          <VerificationRail
            items={[
              { context: 'Cost estimate', status: 'verified', verb: 'Verified', label: 'CGHS rate list' },
              { context: 'Patient consent', status: 'verified', verb: 'Verified', label: 'recorded' },
              {
                context: 'Objectivity check',
                status: 'verified',
                verb: 'Verified',
                label: hasFlags ? 'flags raised — see below' : 'no discrepancies',
              },
            ]}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-white/60 bg-white/25 backdrop-blur-md p-5 text-center space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Verification Panel
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Neutral verification stamps and rate checks render automatically after case submission.
            </p>
          </div>
        )
      }
    >
      <CompletenessChecklist items={completenessItems} />

      {createdCase ? (
        <Card>
          <div className="border-b border-white/40 px-6 py-4 flex items-center justify-between">
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-wider text-slate-500">
                Case Reference ID
              </p>
              <p className="mt-0.5 font-mono text-2xl font-bold tracking-tight text-slate-900">
                {createdCase.caseId}
              </p>
            </div>
            <span className="rounded-full bg-teal-500/15 border border-teal-300/40 backdrop-blur-md px-3 py-1 font-mono text-xs font-semibold text-teal-700">
              ● Active Claim Record
            </span>
          </div>

          <CardHeader
            title="Case Submitted & Rate Verified"
            subtitle="Claim record queued for insurer review"
          />

          <CardBody className="space-y-5">
            <div
              className={`flex items-start gap-3.5 rounded-xl border p-4 ${
                hasFlags ? 'border-amber-300/50 bg-amber-400/10 backdrop-blur-md text-amber-900' : 'border-teal-300/40 bg-teal-500/10 backdrop-blur-md text-teal-900'
              }`}
            >
              <span
                aria-hidden
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  hasFlags ? 'bg-amber-500 text-white' : 'bg-teal-600 text-white'
                }`}
              >
                {hasFlags ? '!' : '✓'}
              </span>
              <div className="text-xs sm:text-sm">
                <p className="font-semibold">
                  {hasFlags
                    ? `Objectivity check flagged ${createdCase.objectivityReport.flags.length} potential issue${createdCase.objectivityReport.flags.length > 1 ? 's' : ''}`
                    : 'Case recorded and queued for insurer review. Objectivity check found zero rate or billing discrepancies.'}
                </p>
              </div>
            </div>

            {hasFlags && (
              <ul className="space-y-2">
                {createdCase.objectivityReport.flags.map((flag) => (
                  <li
                    key={flag}
                    className="flex items-center gap-2 rounded-lg border border-amber-300/40 bg-amber-400/10 backdrop-blur-md px-3 py-2 text-xs font-medium text-amber-900"
                  >
                    <span>⚠️</span>
                    <span>{flag}</span>
                  </li>
                ))}
              </ul>
            )}

            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-xl border border-white/50 bg-white/30 backdrop-blur-md p-4">
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Patient</dt>
                <dd className="mt-0.5 text-sm font-semibold text-slate-900">{form.patientName}</dd>
                <dd className="font-mono text-[11px] text-slate-500">{form.patientId}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Hospital & Ward</dt>
                <dd className="mt-0.5 text-sm font-semibold text-slate-900">{form.hospitalName}</dd>
                <dd className="text-xs text-slate-500">{form.department}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Procedure</dt>
                <dd className="mt-0.5 text-sm font-semibold text-slate-900">{form.procedure}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Insurance Provider & Policy
                </dt>
                <dd className="mt-0.5 text-sm font-semibold text-slate-900">{form.insuranceProvider}</dd>
                <dd className="font-mono text-[11px] text-slate-500">{form.policyId}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Estimated Cost
                </dt>
                <dd className="mt-0.5 font-mono text-base font-bold text-slate-900">
                  {formatCurrency(createdCase.hospitalEstimate)}
                </dd>
                <div className="mt-1.5">
                  <VerificationStamp status="verified" verb="Verified" label="CGHS rate list" compact />
                </div>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Consent Logged
                </dt>
                <dd className="mt-0.5 font-mono text-xs font-semibold text-slate-800">
                  {consentEvent ? formatDateTime(consentEvent.timestamp) : '—'}
                </dd>
                <div className="mt-1.5">
                  <VerificationStamp status="verified" verb="Verified" label="patient authorization" compact />
                </div>
              </div>
            </dl>

            <button type="button" onClick={reset} className="cm-button">
              + Submit Another Case
            </button>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <div className="flex items-center justify-between border-b border-white/40 px-6 py-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">New Patient Claim Submission</h2>
              <p className="text-xs text-slate-500">Fill in patient details & attach medical files for rate audit</p>
            </div>
            <button
              type="button"
              onClick={handleAutoFill}
              className="rounded-xl border border-teal-300/40 bg-teal-500/10 backdrop-blur-md px-3 py-1.5 text-xs font-bold text-teal-800 hover:bg-teal-500/20 transition-all"
            >
              ⚡ Auto-Fill Sample Claim
            </button>
          </div>

          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Section 1: Patient Information */}
              <fieldset className="space-y-4">
                <legend className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  1. Patient Details
                </legend>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-800">
                      Full Patient Name *
                    </label>
                    <input
                      required
                      value={form.patientName}
                      onChange={(e) => update('patientName', e.target.value)}
                      className="cm-field text-xs"
                      placeholder="e.g. Meera Nair"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-800">
                      Patient ID / Aadhaar Number *
                    </label>
                    <input
                      required
                      value={form.patientId}
                      onChange={(e) => update('patientId', e.target.value)}
                      className="cm-field text-xs font-mono"
                      placeholder="e.g. AADHAAR-8839-4412"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800">
                    Clinical History & Diagnosis Notes
                  </label>
                  <textarea
                    value={form.patientHistory}
                    onChange={(e) => update('patientHistory', e.target.value)}
                    rows={2}
                    className="cm-field text-xs"
                    placeholder="Enter diagnosis, symptoms, ultrasound or clinical findings..."
                  />
                </div>
              </fieldset>

              <div className="border-t border-slate-100" />

              {/* Section 2: Hospital & Treatment Details */}
              <fieldset className="space-y-4">
                <legend className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  2. Hospital & Treatment Cost
                </legend>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-800">
                      Hospital Facility Name *
                    </label>
                    <input
                      required
                      value={form.hospitalName}
                      onChange={(e) => update('hospitalName', e.target.value)}
                      className="cm-field text-xs"
                      placeholder="e.g. Sunrise General Hospital"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-800">
                      Department / Ward Unit
                    </label>
                    <input
                      value={form.department}
                      onChange={(e) => update('department', e.target.value)}
                      className="cm-field text-xs"
                      placeholder="e.g. Surgical Ward 3B"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-800">
                      Procedure Name *
                    </label>
                    <input
                      required
                      value={form.procedure}
                      onChange={(e) => update('procedure', e.target.value)}
                      className="cm-field text-xs"
                      placeholder="e.g. Laparoscopic Appendectomy"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-800">
                      ICD-10 / CPT Code (Optional)
                    </label>
                    <input
                      value={form.procedureCode}
                      onChange={(e) => update('procedureCode', e.target.value)}
                      className="cm-field text-xs font-mono"
                      placeholder="e.g. ICD-10 K35.80"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800">
                    Estimated Treatment Cost (INR ₹) *
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    value={form.estimatedCost}
                    onChange={(e) => update('estimatedCost', e.target.value)}
                    className="cm-field text-sm font-mono font-bold"
                    placeholder="e.g. 185000"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Will be cross-checked against CGHS master rates automatically upon submission.
                  </p>
                </div>
              </fieldset>

              <div className="border-t border-slate-100" />

              {/* Section 3: Insurance Details */}
              <fieldset className="space-y-4">
                <legend className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  3. Insurance Provider & Policy
                </legend>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-800">
                      Insurance Provider Name *
                    </label>
                    <input
                      required
                      value={form.insuranceProvider}
                      onChange={(e) => update('insuranceProvider', e.target.value)}
                      className="cm-field text-xs"
                      placeholder="e.g. Star Health Insurance"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-800">
                      Policy Number / Card ID
                    </label>
                    <input
                      value={form.policyId}
                      onChange={(e) => update('policyId', e.target.value)}
                      className="cm-field text-xs font-mono"
                      placeholder="e.g. POL-STAR-44912"
                    />
                  </div>
                </div>
              </fieldset>

              <div className="border-t border-slate-100" />

              {/* Section 4: Attach Files & Medical Documents */}
              <fieldset className="space-y-4">
                <div className="flex items-center justify-between">
                  <legend className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    4. Attach Medical Files & Documents
                  </legend>
                  <span className="text-[11px] text-slate-500">
                    {attachedFileCount > 0 ? `✓ ${attachedFileCount} file(s) attached` : 'Upload PDFs or images'}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {/* Slot 1: Discharge Summary / Case Sheet */}
                  <div className="rounded-xl border border-white/50 bg-white/30 backdrop-blur-md p-3">
                    <label className="block text-xs font-bold text-slate-900">
                      📄 Discharge Summary / Clinical Sheet
                    </label>
                    <p className="text-[10px] text-slate-500 mb-2">Upload medical report or doctor notes</p>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => handleFileSelect('discharge-summary', e.target.files?.[0] ?? null)}
                      className="block w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer"
                    />
                    {attachedFiles['discharge-summary'].file && (
                      <p className="mt-1.5 text-[11px] font-mono text-teal-700 font-bold">
                        ✓ {attachedFiles['discharge-summary'].file?.name} ({(attachedFiles['discharge-summary'].file?.size ?? 0) / 1000} KB)
                      </p>
                    )}
                  </div>

                  {/* Slot 2: Government ID */}
                  <div className="rounded-xl border border-white/50 bg-white/30 backdrop-blur-md p-3">
                    <label className="block text-xs font-bold text-slate-900">
                      🆔 Government ID / Aadhaar Card
                    </label>
                    <p className="text-[10px] text-slate-500 mb-2">Patient identity proof document</p>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => handleFileSelect('id-proof', e.target.files?.[0] ?? null)}
                      className="block w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer"
                    />
                    {attachedFiles['id-proof'].file && (
                      <p className="mt-1.5 text-[11px] font-mono text-teal-700 font-bold">
                        ✓ {attachedFiles['id-proof'].file?.name} ({(attachedFiles['id-proof'].file?.size ?? 0) / 1000} KB)
                      </p>
                    )}
                  </div>

                  {/* Slot 3: Itemized Bill / Estimate */}
                  <div className="rounded-xl border border-white/50 bg-white/30 backdrop-blur-md p-3">
                    <label className="block text-xs font-bold text-slate-900">
                      🧾 Itemized Hospital Bill / Estimate
                    </label>
                    <p className="text-[10px] text-slate-500 mb-2">Cost breakdown breakdown sheet</p>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => handleFileSelect('itemized-bill', e.target.files?.[0] ?? null)}
                      className="block w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer"
                    />
                    {attachedFiles['itemized-bill'].file && (
                      <p className="mt-1.5 text-[11px] font-mono text-teal-700 font-bold">
                        ✓ {attachedFiles['itemized-bill'].file?.name} ({(attachedFiles['itemized-bill'].file?.size ?? 0) / 1000} KB)
                      </p>
                    )}
                  </div>

                  {/* Slot 4: Insurance Policy Copy */}
                  <div className="rounded-xl border border-white/50 bg-white/30 backdrop-blur-md p-3">
                    <label className="block text-xs font-bold text-slate-900">
                      📜 Insurance Policy Document Copy
                    </label>
                    <p className="text-[10px] text-slate-500 mb-2">Policy schedule or TPA card copy</p>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => handleFileSelect('policy-document', e.target.files?.[0] ?? null)}
                      className="block w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer"
                    />
                    {attachedFiles['policy-document'].file && (
                      <p className="mt-1.5 text-[11px] font-mono text-teal-700 font-bold">
                        ✓ {attachedFiles['policy-document'].file?.name} ({(attachedFiles['policy-document'].file?.size ?? 0) / 1000} KB)
                      </p>
                    )}
                  </div>
                </div>
              </fieldset>

              {submitError && (
                <div className="rounded-xl border border-amber-300/40 bg-amber-400/10 backdrop-blur-md p-3 text-xs text-amber-900">
                  ⚠️ {submitError}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="cm-button cm-button-primary w-full py-3.5 text-sm font-bold shadow-md disabled:opacity-60"
              >
                {submitting ? 'Submitting Claim & Uploading Files…' : '🚀 Submit Case & Run Automated Objectivity Audit →'}
              </button>
            </form>
          </CardBody>
        </Card>
      )}

      {/* Persistent Document Manager */}
      <DocumentChecklist caseId={createdCase?.caseId ?? null} onChange={setUploadedDocsList} />
    </CaseFileShell>
  );
}

export default function HospitalPage() {
  return (
    <ProtectedPage requiredRole="hospital">
      <HospitalContent />
    </ProtectedPage>
  );
}
