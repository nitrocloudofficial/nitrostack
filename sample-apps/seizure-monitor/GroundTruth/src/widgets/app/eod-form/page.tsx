'use client';

import { useState } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import { Chip, GroundTruthFrame } from '../_shared/tokens';
import { unwrapToolResult } from '../_shared/tool-result';

interface FormData {
  date: string;
  employees: Array<{ id: string; name: string; role: string }>;
  selectedEmployeeId: string | null;
}

interface SubmitResult {
  stored: boolean;
  reportId: string;
  employee: { name: string };
  claims: Array<{ text: string; assertsCompletion: boolean }>;
  blockers: string[];
  sentiment: string;
}

const CONFIDENCE_LABELS: Record<number, string> = {
  1: 'Struggling',
  2: 'Behind',
  3: 'On track',
  4: 'Good',
  5: 'Ahead',
};

export default function EodForm() {
  const { isReady, getToolOutput, theme, callTool, sendFollowUpMessage } =
    useWidgetSDK();
  const data = getToolOutput<FormData>();

  const [employeeId, setEmployeeId] = useState<string>('');
  const [reportText, setReportText] = useState('');
  const [confidence, setConfidence] = useState(3);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [handoffFailed, setHandoffFailed] = useState(false);

  /**
   * Hands the review over to the chat agent.
   *
   * Only works where a conversation exists. Rendered in a preview pane — Studio's
   * Tools page, for instance — there is nothing to send into, and the raw failure
   * surfaces as an unexplained error toast. Catch it and say what to do instead.
   */
  const handoff = async (message: string) => {
    try {
      await sendFollowUpMessage(message);
      setHandoffFailed(false);
    } catch {
      setHandoffFailed(true);
    }
  };

  if (!isReady) {
    return (
      <GroundTruthFrame theme={theme}>
        <div className="gt-panel gt-muted">Connecting to host…</div>
      </GroundTruthFrame>
    );
  }

  if (!data) {
    return (
      <GroundTruthFrame theme={theme}>
        <div className="gt-panel gt-muted">
          No form data received. Run the <code>open_eod_form</code> tool.
        </div>
      </GroundTruthFrame>
    );
  }

  const currentEmployee = employeeId || data.selectedEmployeeId || '';

  const submit = async () => {
    if (!currentEmployee || reportText.trim().length < 3) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await callTool('submit_eod_report', {
        employeeId: currentEmployee,
        reportText: reportText.trim(),
        confidence,
        date: data.date,
      });
      const parsed = unwrapToolResult<SubmitResult>(response);
      if (!parsed?.stored) {
        setError('The report did not save. Check the server logs and try again.');
        return;
      }
      setResult(parsed);
    } catch {
      setError('Could not save the report. Check the server logs and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    const name = result.employee?.name ?? 'This report';
    return (
      <GroundTruthFrame theme={theme}>
        <div className="gt-panel">
          <div>
            <p className="gt-eyebrow">Recorded · {data.date}</p>
            <h2 className="gt-title">{name}&apos;s report is in</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="gt-label">Claims GroundTruth will verify</span>
            {result.claims?.length ? (
              <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {result.claims.map((claim, i) => (
                  <li key={i}>
                    {claim.text}
                    {claim.assertsCompletion && (
                      <>
                        {' '}
                        <Chip tone="accent">claims done</Chip>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <span className="gt-muted">No distinct claims detected.</span>
            )}
          </div>

          {result.blockers?.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span className="gt-label">Blockers flagged</span>
              <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {result.blockers.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          )}

          {/*
            Carries an abridged version of the review_eod_submission loop rather
            than a bare "review this". A button that produces visibly worse
            reasoning than the documented path is a trap: the model needs the
            rubric, and above all needs telling that a low match score is not on
            its own grounds to alert.
          */}
          <button
            className="gt-btn"
            onClick={() =>
              handoff(
                `Review ${name}'s end-of-day report for ${data.date}. ` +
                  'Call crosscheck_activity to compare the claims against their real GitHub ' +
                  'commits and pull requests, then reason out loud about whether any gap is ' +
                  'genuine — meetings, review, pairing and design work legitimately leave no ' +
                  'commits, so a low match score alone is not a problem. Weigh any blocker ' +
                  'that has repeated across days more heavily than a single day of mismatch. ' +
                  'Call send_manager_alert only if you judge it warranted, with a specific ' +
                  'evidence-based reason; otherwise say plainly that nothing needs raising.',
              )
            }
          >
            Verify against GitHub
          </button>

          {handoffFailed && (
            <p className="gt-muted" style={{ margin: 0, fontSize: 12 }}>
              This hands the review to the chat agent, so it needs a conversation to
              send into. You are viewing this in a preview pane — open{' '}
              <strong>AI Chat</strong> and ask it to review {name}&apos;s report for{' '}
              {data.date}. The report is already saved.
            </p>
          )}
        </div>
      </GroundTruthFrame>
    );
  }

  return (
    <GroundTruthFrame theme={theme}>
      <div className="gt-panel">
        <div>
          <p className="gt-eyebrow">End of day · {data.date}</p>
          <h2 className="gt-title">What did you work on today?</h2>
        </div>

        <div className="gt-field">
          <label className="gt-label" htmlFor="gt-employee">
            Who is reporting
          </label>
          <select
            id="gt-employee"
            className="gt-select"
            value={currentEmployee}
            onChange={(e) => setEmployeeId(e.target.value)}
          >
            {data.employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} — {e.role}
              </option>
            ))}
          </select>
        </div>

        <div className="gt-field">
          <label className="gt-label" htmlFor="gt-report">
            Your update — and anything blocking you
          </label>
          <textarea
            id="gt-report"
            className="gt-textarea"
            value={reportText}
            placeholder="Finished the login module and opened a PR. Still blocked on the staging database credentials."
            onChange={(e) => setReportText(e.target.value)}
          />
          <span className="gt-muted" style={{ fontSize: 12 }}>
            Write it plainly. GroundTruth checks claims against your real commits, so
            an honest &ldquo;still in progress&rdquo; reads better than an optimistic
            &ldquo;done&rdquo;.
          </span>
        </div>

        <div className="gt-field">
          <label className="gt-label" htmlFor="gt-confidence">
            How is it going? —{' '}
            <span style={{ color: 'var(--gt-accent)' }}>
              {CONFIDENCE_LABELS[confidence]}
            </span>
          </label>
          <input
            id="gt-confidence"
            className="gt-input"
            type="range"
            min={1}
            max={5}
            step={1}
            value={confidence}
            onChange={(e) => setConfidence(Number(e.target.value))}
            style={{ padding: 0, background: 'transparent', border: 'none' }}
          />
          <div
            className="gt-muted gt-mono"
            style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}
          >
            <span>1 struggling</span>
            <span>5 ahead</span>
          </div>
        </div>

        {error && (
          <div className="gt-row gt-row--bad" style={{ fontSize: 13 }}>
            {error}
          </div>
        )}

        <button
          className="gt-btn"
          onClick={submit}
          disabled={submitting || reportText.trim().length < 3}
        >
          {submitting ? 'Saving…' : 'Submit report'}
        </button>
      </div>
    </GroundTruthFrame>
  );
}
