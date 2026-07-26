'use client';

import { useState, useRef } from 'react';
import { useCase } from '@/lib/case-context';
import { ApiError } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { DecisionInput } from '@/lib/types';

type ActionMode = null | 'approve-custom' | 'more-info' | 'deny';

export function InsurerActionPanel() {
  const { caseData, submitDecision } = useCase();
  const [mode, setMode] = useState<ActionMode>(null);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [editingCommitted, setEditingCommitted] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  if (!caseData) return null;

  async function handleApproveCustom(e: React.FormEvent) {
    e.preventDefault();
    if (!caseData) return;
    setSubmitting(true);
    setSubmitError(null);

    const amountNum = Number(customAmount || caseData.hospitalEstimate);
    if (isNaN(amountNum) || amountNum < 0) {
      setSubmitError('Please enter a valid positive approved amount.');
      setSubmitting(false);
      return;
    }
    if (amountNum > caseData.hospitalEstimate) {
      setSubmitError(`Approved amount cannot exceed hospital estimate of ${formatCurrency(caseData.hospitalEstimate)}.`);
      setSubmitting(false);
      return;
    }

    const trimmedNote = note.trim();
    let decision: DecisionInput;
    if (amountNum === caseData.hospitalEstimate) {
      decision = { action: 'approve' };
    } else {
      decision = {
        action: 'partial',
        approvedAmount: amountNum,
        note: trimmedNote || `Approved amount set to ${formatCurrency(amountNum)}.`,
      };
    }

    try {
      await submitDecision(decision);
      setMode(null);
      setNote('');
      setEditingCommitted(false);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Could not save approved amount.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDenyOrInfo(actionType: 'deny' | 'more-info') {
    if (!caseData) return;
    setSubmitting(true);
    setSubmitError(null);
    const trimmedNote = note.trim();

    const decision: DecisionInput =
      actionType === 'deny'
        ? { action: 'deny', note: trimmedNote || 'Claim denied.' }
        : { action: 'more-info', note: trimmedNote || 'More details needed.' };

    try {
      await submitDecision(decision);
      setMode(null);
      setNote('');
      setEditingCommitted(false);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Could not save decision.');
    } finally {
      setSubmitting(false);
    }
  }

  const isDecided = caseData.claimStatus === 'approved' || caseData.claimStatus === 'partial';

  return (
    <div className="glass rounded-2xl p-4">
      <div className="border-b border-white/40 pb-2 mb-3 flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Insurer Adjudication
        </h2>
        {isDecided && (
          <span className="text-[10px] font-bold text-teal-700 bg-teal-500/15 backdrop-blur-md border border-teal-300/40 px-2 py-0.5 rounded-full">
            ● Decision Recorded
          </span>
        )}
      </div>

      <div className="space-y-3">
        {/* Approved Summary Card with Re-edit Button */}
        {isDecided && !editingCommitted && mode === null && (
          <div className="rounded-xl border border-teal-300/40 bg-teal-500/10 backdrop-blur-md p-3 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-teal-900">Approved Amount</span>
              <span className="font-mono text-base font-extrabold text-teal-800">
                {formatCurrency(caseData.insurerApproved)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-teal-700 pt-1 border-t border-teal-300/40">
              <span>Patient Gap: {formatCurrency(caseData.gap)}</span>
              <button
                type="button"
                onClick={() => {
                  setCustomAmount(String(caseData.insurerApproved));
                  setMode('approve-custom');
                  setEditingCommitted(true);
                }}
                className="font-bold text-teal-800 hover:underline bg-white/50 backdrop-blur-md px-2 py-0.5 rounded border border-teal-300/40"
              >
                ✏️ Edit Amount
              </button>
            </div>
          </div>
        )}

        {submitError && (
          <p className="text-xs text-amber-700 bg-amber-400/10 backdrop-blur-md p-2.5 rounded-xl border border-amber-300/40">
            ⚠️ {submitError}
          </p>
        )}

        {/* Initial Buttons */}
        {mode === null && (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                setCustomAmount(String(caseData.insurerApproved || caseData.hospitalEstimate));
                setMode('approve-custom');
              }}
              disabled={submitting}
              className="cm-button cm-button-verified w-full py-2 text-xs font-bold disabled:opacity-60"
            >
              ✏️ {isDecided ? 'Edit Approved Amount' : 'Approve / Edit Amount'}
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                setMode('more-info');
                setTimeout(() => noteRef.current?.focus(), 50);
              }}
              className="cm-button cm-button-amber w-full py-2 text-xs font-semibold disabled:opacity-60"
            >
              💬 Request Info
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                setMode('deny');
                setTimeout(() => noteRef.current?.focus(), 50);
              }}
              className="cm-button w-full py-2 text-xs font-semibold text-slate-700 disabled:opacity-60"
            >
              🚫 Deny Claim
            </button>
          </div>
        )}

        {/* Mode: Custom Approve / Edit Approved Amount Form */}
        {mode === 'approve-custom' && (
          <form onSubmit={handleApproveCustom} className="space-y-3 rounded-xl border border-teal-300/40 bg-teal-500/10 backdrop-blur-md p-3">
            <div>
              <label className="block text-xs font-bold text-teal-900">
                Set Approved Amount (₹)
              </label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max={caseData.hospitalEstimate}
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="cm-field text-xs font-mono font-bold"
                  placeholder={String(caseData.hospitalEstimate)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setCustomAmount(String(caseData.hospitalEstimate))}
                  className="shrink-0 text-[10px] font-bold bg-teal-600 text-white px-2 py-2 rounded-lg"
                  title="Approve 100% full estimate"
                >
                  Full 100%
                </button>
              </div>
              <p className="mt-1 text-[10px] text-teal-700">
                Hospital Estimate: {formatCurrency(caseData.hospitalEstimate)}
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700">
                Approval Note / Adjudication Remarks (Optional)
              </label>
              <textarea
                ref={noteRef}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="cm-field text-xs mt-1"
                placeholder="e.g. Approved per CGHS code guidelines..."
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="cm-button cm-button-verified flex-1 text-xs py-1.5 font-bold disabled:opacity-60"
              >
                {submitting ? 'Saving…' : '✓ Confirm Approved Amount'}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setMode(null);
                  setNote('');
                  setEditingCommitted(false);
                }}
                className="cm-button text-xs py-1.5"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Mode: Deny / Request Info Form */}
        {(mode === 'more-info' || mode === 'deny') && (
          <div className="space-y-2 rounded-xl border border-white/50 bg-white/35 backdrop-blur-md p-3">
            <p className="text-xs font-bold text-slate-800">
              {mode === 'deny' ? 'Deny Claim' : 'Request More Info'}
            </p>
            <textarea
              ref={noteRef}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="cm-field text-xs mt-1"
              placeholder={mode === 'deny' ? 'Reason for denial…' : 'Details needed from hospital/patient…'}
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleDenyOrInfo(mode)}
                className="cm-button cm-button-primary flex-1 text-xs py-1.5 disabled:opacity-60"
              >
                {submitting ? 'Saving…' : 'Confirm'}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setMode(null);
                  setNote('');
                }}
                className="cm-button text-xs py-1.5"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
