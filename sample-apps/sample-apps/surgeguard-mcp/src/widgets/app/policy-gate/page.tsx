'use client';

import { useState } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import {
  findToolEnvelope,
  Kpi,
  Panel,
  ToolEnvelope,
  WidgetShell,
  statusClass,
  useWidgetData,
} from '../../components/widget-shell';

interface PolicyGateData {
  status: string;
  evaluation_session: {
    evaluated_at: string;
    plan_hash: string;
    rules_evaluated: number;
    rules_passed: number;
    source_snapshot_age_seconds: number;
  };
  violations: Array<{
    code: string;
    title: string;
    severity: string;
    constraint_type: string;
    status: string;
    overridable: boolean;
    evidence: string;
    remediation: string;
  }>;
  evidence: Array<{ source: string; as_of: string; status: string }>;
}

type PlanChoice = 'balanced_decompression' | 'fast_capacity_release' | 'transfer_first';

const fallback: ToolEnvelope<PolicyGateData> = {
  ok: true,
  correlation_id: 'demo-policy-gate',
  data: {
    status: 'blocked',
    evaluation_session: {
      evaluated_at: '2026-07-25T17:15:00.000Z',
      plan_hash: 'sha256:82f7d97091d42b9386fb8a4406ef10fe',
      rules_evaluated: 42,
      rules_passed: 39,
      source_snapshot_age_seconds: 118,
    },
    violations: [
      {
        code: 'STAFF.ED.RN.MIN',
        title: 'Emergency RN minimum coverage',
        severity: 'critical',
        constraint_type: 'hard',
        status: 'open',
        overridable: false,
        evidence: '21 eligible RNs for a required minimum of 26.',
        remediation: 'Add five eligible ED RNs or reduce activated treatment capacity.',
      },
    ],
    evidence: [
      { source: 'Workforce eligibility projection', as_of: '2026-07-25T17:11:00.000Z', status: 'current' },
      { source: 'Bed capability registry', as_of: '2026-07-25T17:13:00.000Z', status: 'current' },
      { source: 'Policy release SG-ED-4.2', as_of: '2026-06-30T00:00:00.000Z', status: 'published' },
    ],
  },
};

function checkedSourceName(source: string) {
  if (source.toLowerCase().includes('workforce')) return 'Qualified staffing coverage';
  if (source.toLowerCase().includes('bed')) return 'Usable bed capacity';
  if (source.toLowerCase().includes('policy')) return 'Surge safety policy';
  return source;
}

export default function PolicyGate() {
  // Safety evaluation is also snapshot-based. It changes only when explicitly
  // checked again, never while a person is reading the decision.
  const initial = useWidgetData(fallback);
  const sdk = useWidgetSDK();
  const toolInput = sdk.getToolInput<{ plan?: PlanChoice }>();
  const [output, setOutput] = useState(initial);
  const [plan, setPlan] = useState<PlanChoice>(toolInput?.plan ?? 'balanced_decompression');
  const [busy, setBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const { data } = output;
  const hardViolations = data.violations.filter((item) => item.constraint_type === 'hard');
  const decision =
    data.status === 'blocked'
      ? 'Not ready'
      : data.status === 'conditional'
        ? 'Ready with condition'
        : 'Ready';

  async function recheckSafety() {
    setBusy(true);
    setActionMessage('Rechecking staffing, capacity and policy requirements…');
    try {
      const result = await sdk.callTool('check_plan_safety', { plan });
      const next = findToolEnvelope<PolicyGateData>(result);
      if (!next) throw new Error('The safety tool returned an unreadable response.');
      setOutput(next);
      setActionMessage(`Safety check complete: ${next.data.status.replaceAll('_', ' ')}.`);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'The safety check could not be completed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <WidgetShell
      eyebrow="Final safety check"
      title="Can this plan run safely?"
      subtitle="This screen does not rank or choose plans. It only checks whether the selected plan can be approved under the current staffing, capacity and safety requirements."
      status={data.status}
      freshness="Decision snapshot locked until the safety check is run again"
    >
      <div className="sg-kpi-grid">
        <Kpi
          label="Approval status"
          value={decision}
          note={data.status === 'blocked'
            ? 'Do not approve or execute'
            : data.status === 'conditional'
              ? 'Complete the listed action'
              : 'No safety block found'}
        />
        <Kpi label="Blocking issues" value={hardViolations.length} note={hardViolations.length ? 'Must be resolved' : 'None'} />
        <Kpi label="Required follow-ups" value={data.violations.length} note={data.violations.length ? 'Shown below' : 'None'} />
        <Kpi label="Information status" value="Current" note={`${data.evidence.length} operational inputs checked`} />
      </div>

      <section className="sg-action-strip" aria-label="Plan safety check">
        <div>
          <p className="sg-action-title">Re-run the live safety gate</p>
          <p className="sg-action-copy">Choose a plan and evaluate it against the latest synchronized hospital state.</p>
        </div>
        <label className="sg-field">
          <span>Plan</span>
          <select value={plan} onChange={(change) => setPlan(change.target.value as PlanChoice)}>
            <option value="balanced_decompression">Balanced decompression</option>
            <option value="transfer_first">Transfer-first</option>
            <option value="fast_capacity_release">Fast capacity release</option>
          </select>
        </label>
        <button className="sg-button" disabled={!sdk.isReady || busy} onClick={() => void recheckSafety()}>
          {busy ? 'Checking…' : 'Check current safety'}
        </button>
      </section>
      {actionMessage ? <p className="sg-action-status" role="status">{actionMessage}</p> : null}

      <div className={`sg-alert ${data.status === 'blocked' ? 'sg-alert--danger' : ''}`} style={{ marginBottom: 14 }}>
        <div>
          <p className="sg-alert-title">
            {data.status === 'blocked'
              ? 'This plan cannot run yet'
              : data.status === 'conditional'
                ? 'This plan can run after one required action'
                : 'This plan is ready for approval'}
          </p>
          <p className="sg-alert-text">
            {data.status === 'blocked'
              ? 'Resolve every blocking issue below, then run the safety check again. The system will not allow approval to bypass it.'
              : data.status === 'conditional'
                ? 'Complete and retain the required action shown below before approval.'
                : 'Current staffing, capacity and safety requirements allow this plan to proceed to human approval.'}
          </p>
        </div>
      </div>

      <div className="sg-grid-2">
        <Panel title="What must happen next" meta={`${data.violations.length} required`}>
          <div className="sg-list">
            {data.violations.length ? data.violations.map((violation) => (
              <article className="sg-list-item" key={violation.code}>
                <div className="sg-list-item-head">
                  <div>
                    <h4>{violation.title}</h4>
                    <p>{violation.constraint_type === 'hard' ? 'Required before approval' : 'Required operating condition'}</p>
                  </div>
                  <span className={statusClass(violation.constraint_type === 'hard' ? 'blocked' : 'conditional')}>
                    {violation.constraint_type === 'hard' ? 'Blocking' : 'Condition'}
                  </span>
                </div>
                <p><strong style={{ color: 'var(--sg-ink)' }}>Why:</strong> {violation.evidence}</p>
                <p><strong style={{ color: 'var(--sg-ink)' }}>Required action:</strong> {violation.remediation}</p>
              </article>
            )) : (
              <article className="sg-list-item">
                <h4>No corrective action required</h4>
                <p>The selected plan meets the currently evaluated safety requirements.</p>
              </article>
            )}
          </div>
        </Panel>

        <Panel title="Information checked" meta="Current plan snapshot">
          <div className="sg-list">
            {data.evidence.map((evidence) => (
              <article className="sg-list-item" key={evidence.source}>
                <div className="sg-list-item-head">
                  <h4>{checkedSourceName(evidence.source)}</h4>
                  <span className={statusClass(evidence.status === 'published' ? 'ready' : evidence.status)}>
                    {evidence.status}
                  </span>
                </div>
                <p>Used to determine whether the selected plan is safe to approve.</p>
              </article>
            ))}
          </div>
        </Panel>
      </div>
    </WidgetShell>
  );
}
