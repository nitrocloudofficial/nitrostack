'use client';

import { useState } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import {
  findToolEnvelope,
  Kpi,
  Panel,
  ToolEnvelope,
  WidgetShell,
  progressStyle,
  statusClass,
  useLiveWidgetData,
} from '../../components/widget-shell';

interface ExecutionData {
  execution: {
    plan_execution_id: string;
    plan_name: string;
    status: string;
    progress_percent: number;
    started_at: string;
    expected_complete_at: string;
    policy_gate_status: string;
    last_gate_at: string;
  };
  steps: Array<{
    sequence: number;
    name: string;
    owner: string;
    status: string;
    progress?: number;
    completed_at?: string;
  }>;
  deviations: Array<{
    severity: string;
    description: string;
    corrective_action: string;
    gate_impact: string;
  }>;
  metrics: {
    projected_wait_reduction_percent: number;
    observed_wait_reduction_percent: number;
    beds_released: number;
    staff_confirmed: number;
    rollback_ready: boolean;
  };
}

const fallback: ToolEnvelope<ExecutionData> = {
  ok: true,
  correlation_id: 'demo-execution',
  data: {
    execution: {
      plan_execution_id: 'demo-execution-id',
      plan_name: 'Balanced decompression',
      status: 'running',
      progress_percent: 58,
      started_at: '2026-07-25T16:41:00.000Z',
      expected_complete_at: '2026-07-25T17:56:00.000Z',
      policy_gate_status: 'clear',
      last_gate_at: '2026-07-25T17:13:00.000Z',
    },
    steps: [
      { sequence: 1, name: 'Revalidate source snapshot', owner: 'Automation', status: 'succeeded', completed_at: '2026-07-25T16:42:00.000Z' },
      { sequence: 2, name: 'Activate discharge lounge', owner: 'Patient Flow', status: 'succeeded', completed_at: '2026-07-25T16:48:00.000Z' },
      { sequence: 3, name: 'Prepare 4 North flex beds', owner: 'Bed Command', status: 'running', progress: 75 },
      { sequence: 4, name: 'Call eligible ED RN pool', owner: 'Nursing Ops', status: 'running', progress: 40 },
      { sequence: 5, name: 'Open diversion routes', owner: 'ED Charge', status: 'queued' },
    ],
    deviations: [
      { severity: 'low', description: 'Environmental services completion is 8 minutes behind plan.', corrective_action: 'Prioritize rooms 4N-12 and 4N-14.', gate_impact: 'none' },
    ],
    metrics: {
      projected_wait_reduction_percent: 23,
      observed_wait_reduction_percent: 11,
      beds_released: 4,
      staff_confirmed: 3,
      rollback_ready: true,
    },
  },
  policy_gate: { status: 'clear', violations: [] },
};

function time(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  }).format(new Date(value));
}

export default function ExecutionMonitor() {
  const { data } = useLiveWidgetData(fallback, 'execution');
  const { callTool, isReady } = useWidgetSDK();
  const [pace, setPace] = useState<'cautious' | 'standard' | 'rapid'>('standard');
  const [busy, setBusy] = useState(false);
  const [summaryMessage, setSummaryMessage] = useState<string | null>(null);
  const execution = data.execution;

  function planChoice() {
    const normalized = execution.plan_name.toLowerCase();
    if (normalized.includes('transfer')) return 'transfer_first';
    if (normalized.includes('fast')) return 'fast_capacity_release';
    return 'balanced_decompression';
  }

  async function advanceExecution() {
    setBusy(true);
    setSummaryMessage(`Advancing the approved plan at ${pace} pace…`);
    try {
      const result = await callTool('execute_approved_plan', {
        plan: planChoice(),
        pace,
      });
      const next = findToolEnvelope<ExecutionData>(result);
      if (!next) throw new Error('The execution tool returned an unreadable response.');
      const nextExecution = next.data.execution;
      setSummaryMessage(
        nextExecution.status === 'failed'
          ? 'Execution was blocked. Review the deviation and record a matching plan approval first.'
          : `Execution advanced to ${nextExecution.progress_percent}% (${nextExecution.status.replaceAll('_', ' ')}).`,
      );
    } catch (error) {
      setSummaryMessage(
        error instanceof Error ? error.message : 'Execution could not be advanced.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <WidgetShell
      eyebrow="Controlled execution"
      title={execution.plan_name}
      subtitle="Execution is tracked as auditable, idempotent steps with live deviations, re-evaluation status and rollback readiness."
      status={execution.status}
      freshness={`Last policy gate ${time(execution.last_gate_at)} · ${execution.policy_gate_status}`}
    >
      <div className="sg-kpi-grid">
        <Kpi label="Execution progress" value={`${execution.progress_percent}%`} note={`Expected complete ${time(execution.expected_complete_at)}`} />
        <Kpi label="Observed wait relief" value={`${data.metrics.observed_wait_reduction_percent}%`} note={`${data.metrics.projected_wait_reduction_percent}% projected`} />
        <Kpi label="Beds released" value={data.metrics.beds_released} note="Of 8 planned" />
        <Kpi label="Rollback" value={data.metrics.rollback_ready ? 'Ready' : 'At risk'} note="Evidence retained per step" />
      </div>

      <div className="sg-progress" style={{ ...progressStyle(execution.progress_percent), height: 9, marginBottom: 15 }}>
        <span />
      </div>

      <div className="sg-grid-2">
        <Panel title="Execution steps" meta={`${data.steps.filter((step) => step.status === 'succeeded').length}/${data.steps.length} complete`}>
          <div className="sg-timeline">
            {data.steps.map((step) => (
              <div className="sg-step" key={step.sequence}>
                <span className={`sg-step-index ${step.status === 'succeeded' ? 'sg-step-index--done' : step.status === 'running' ? 'sg-step-index--running' : ''}`}>
                  {step.status === 'succeeded' ? '✓' : step.sequence}
                </span>
                <div>
                  <p className="sg-step-title">{step.name}</p>
                  <p className="sg-step-owner">{step.owner}{step.progress !== undefined ? ` · ${step.progress}%` : ''}</p>
                </div>
                <span className={statusClass(step.status)}>{step.status}</span>
              </div>
            ))}
          </div>
        </Panel>

        <div style={{ display: 'grid', gap: 14 }}>
          <Panel title="Observed deviation" meta={`${data.deviations.length} open`}>
            <div className="sg-list">
              {data.deviations.map((deviation) => (
                <div className="sg-alert" key={deviation.description}>
                  <div>
                    <p className="sg-alert-title">{deviation.severity} severity · gate impact {deviation.gate_impact}</p>
                    <p className="sg-alert-text">{deviation.description}</p>
                    <p className="sg-alert-text"><strong style={{ color: 'var(--sg-ink)' }}>Correction:</strong> {deviation.corrective_action}</p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Command controls" meta="Human authority required">
            <div className="sg-list">
              <label className="sg-field">
                <span>Execution pace</span>
                <select value={pace} onChange={(change) => setPace(change.target.value as typeof pace)}>
                  <option value="cautious">Cautious · +20%</option>
                  <option value="standard">Standard · +35%</option>
                  <option value="rapid">Rapid · +50%</option>
                </select>
              </label>
              <button
                className="sg-button"
                disabled={!isReady || busy || execution.status === 'completed'}
                onClick={() => void advanceExecution()}
              >
                {busy
                  ? 'Advancing…'
                  : execution.status === 'completed'
                    ? 'Execution completed'
                    : execution.status === 'queued'
                      ? 'Start approved execution'
                      : 'Advance execution'}
              </button>
              {summaryMessage ? (
                <p className="sg-panel-meta" role="status" style={{ margin: 0 }}>
                  {summaryMessage}
                </p>
              ) : null}
              <p className="sg-panel-meta" style={{ margin: 0 }}>Each click rechecks approval and safety, advances auditable simulation steps, and updates observed outcomes. Rollback remains ready but requires a separate governed command.</p>
            </div>
          </Panel>
        </div>
      </div>
    </WidgetShell>
  );
}
