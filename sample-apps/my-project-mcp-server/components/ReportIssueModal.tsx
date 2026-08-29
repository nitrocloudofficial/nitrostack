'use client';

import { useState } from 'react';
import { getCase, reportIssue, ApiError } from '@/lib/api';
import { useCase } from '@/lib/case-context';

const ISSUE_TYPES = [
  'Billing discrepancy',
  'Coverage denied unfairly',
  'Incorrect procedure or diagnosis code',
  'Financing offer concern',
  'Other',
];

export function ReportIssueModal({ caseId }: { caseId: string }) {
  const { applyCaseUpdate } = useCase();
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [issueType, setIssueType] = useState(ISSUE_TYPES[0]);
  const [description, setDescription] = useState('');

  function close() {
    setOpen(false);
    setSubmitted(false);
    setSubmitError(null);
    setIssueType(ISSUE_TYPES[0]);
    setDescription('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      await reportIssue(caseId, issueType, description);
      const updated = await getCase(caseId);
      applyCaseUpdate(updated);
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Could not report the issue.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="cm-button text-xs"
      >
        ⚠️ Report an Issue
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-md animate-route-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-issue-heading"
          onClick={close}
        >
          <div
            className="glass-strong w-full max-w-md rounded-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {submitted ? (
              <div className="py-4 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-teal-700 text-xl font-bold">
                  ✓
                </div>
                <h3 className="mt-3 text-lg font-bold text-slate-900">
                  Issue Report Logged
                </h3>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  Recorded against case <span className="font-mono font-bold text-slate-800">{caseId}</span> and appended to the shared timeline for all parties.
                </p>
                <button
                  type="button"
                  onClick={close}
                  className="cm-button cm-button-primary mt-6 w-full py-2.5 text-xs font-semibold"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <h3 id="report-issue-heading" className="text-lg font-bold text-slate-900">
                    Report a Case Issue
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Case <span className="font-mono font-semibold">{caseId}</span> — logged to the shared case timeline.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800">
                    Issue Category
                  </label>
                  <select
                    value={issueType}
                    onChange={(e) => setIssueType(e.target.value)}
                    className="cm-field text-xs"
                  >
                    {ISSUE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800">
                    Description of Discrepancy
                  </label>
                  <textarea
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Describe what looks incorrect or requires escalation..."
                    className="cm-field text-xs"
                  />
                </div>

                {submitError && <p className="text-xs text-amber-600">⚠️ {submitError}</p>}

                <div className="mt-6 flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={close}
                    className="cm-button text-xs py-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="cm-button cm-button-primary text-xs py-2 disabled:opacity-60"
                  >
                    {submitting ? 'Submitting…' : 'Submit Issue'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
