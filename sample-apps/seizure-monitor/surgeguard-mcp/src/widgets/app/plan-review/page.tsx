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

interface PlanData {
  plan: {
    candidate_plan_id: string;
    name: string;
    rank: number;
    status: string;
    gate_status: string;
    plan_hash: string;
    assumptions: string[];
  };
  actions: Array<{ order: number; action: string; owner: string; start: string; status: string }>;
  allocations: { beds: number; staff_assignments: number; transfers: number; devices: number };
  scores: { safety: number; wait_reduction: number; time_to_effect_minutes: number; cost_index: number };
  approvals: Array<{ role: string; status: string; decided_at?: string }>;
}

const fallback: ToolEnvelope<PlanData> = {
  ok: true,
  correlation_id: 'demo-plan',
  data: {
    plan: {
      candidate_plan_id: '98c9b7f2-a9ce-49a9-97d2-b39e181c51d3',
      name: 'Balanced decompression',
      rank: 1,
      status: 'pending_approval',
      gate_status: 'conditional',
      plan_hash: 'sha256:82f7d97091d42b9386fb8a4406ef10fe',
      assumptions: ['Arrival rate remains within P90 forecast', 'Discharge lounge available by 23:00'],
    },
    actions: [
      { order: 1, action: 'Open 8 flex beds in 4 North', owner: 'Bed Command', start: '2026-07-25T17:35:00.000Z', status: 'ready' },
      { order: 2, action: 'Move 6 discharge-ready patients to lounge', owner: 'Patient Flow', start: '2026-07-25T17:25:00.000Z', status: 'ready' },
      { order: 3, action: 'Call in 5 ED RNs from eligible pool', owner: 'Nursing Ops', start: '2026-07-25T17:20:00.000Z', status: 'conditional' },
      { order: 4, action: 'Route airborne isolation to NP-04 / NP-06', owner: 'ED Charge', start: '2026-07-25T17:30:00.000Z', status: 'ready' },
    ],
    allocations: { beds: 8, staff_assignments: 12, transfers: 3, devices: 6 },
    scores: { safety: 96, wait_reduction: 23, time_to_effect_minutes: 38, cost_index: 1.14 },
    approvals: [
      { role: 'Incident Commander', status: 'approved', decided_at: '2026-07-25T17:09:00.000Z' },
      { role: 'Nursing Supervisor', status: 'pending' },
      { role: 'Safety Officer', status: 'pending' },
    ],
  },
  policy_gate: { status: 'conditional', violations: [] },
};

export default function PlanReview() {
  const initial = useWidgetData(fallback);
  const sdk = useWidgetSDK();
  const [output, setOutput] = useState(initial);
  const [approvalNote, setApprovalNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const { data } = output;
  const plan = data.plan;
  const isApproved = plan.status === 'approved';

  function planChoice() {
    const normalized = plan.name.toLowerCase();
    if (normalized.includes('transfer')) return 'transfer_first';
    if (normalized.includes('fast')) return 'fast_capacity_release';
    return 'balanced_decompression';
  }

  async function approvePlan() {
    setBusy(true);
    setActionMessage('Revalidating the safety gate and recording demo approval…');
    try {
      const result = await sdk.callTool('approve_safe_plan', {
        plan: planChoice(),
        ...(approvalNote.trim() ? { approval_note: approvalNote.trim() } : {}),
      });
      const next = findToolEnvelope<PlanData>(result);
      if (!next) throw new Error('The approval tool returned an unreadable response.');
      setOutput(next);
      setActionMessage(
        next.data.plan.status === 'approved'
          ? 'Demo approval recorded. The plan is now eligible for controlled execution.'
          : 'Approval was not recorded because the current safety gate still blocks this plan.',
      );
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'The demo approval could not be recorded.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <WidgetShell
      eyebrow={`Candidate plan · Rank ${plan.rank}`}
      title={plan.name}
      subtitle="This plan is locked while you review its actions, expected benefit, requirements and approvals. It changes only when new plans are explicitly generated."
      status={plan.gate_status}
      freshness="Review snapshot locked"
    >
      <div className="sg-kpi-grid">
        <Kpi label="Safety score" value={`${data.scores.safety}/100`} note="After policy evaluation" />
        <Kpi label="Wait reduction" value={`${data.scores.wait_reduction}%`} note="Forecasted at horizon" />
        <Kpi label="Time to effect" value={`${data.scores.time_to_effect_minutes}m`} note="First material relief" />
        <Kpi label="Cost index" value={`${data.scores.cost_index.toFixed(2)}×`} note="Relative to baseline" />
      </div>

      <section className="sg-action-strip sg-action-strip--approval" aria-label="Plan approval">
        <div>
          <p className="sg-action-title">{isApproved ? 'Plan approved for simulation' : 'Record human approval'}</p>
          <p className="sg-action-copy">
            {isApproved
              ? 'Approval evidence is retained below. You can now use the execution monitor.'
              : 'The safety gate is rechecked at the moment of approval. This demo action has no external hospital effect.'}
          </p>
        </div>
        <label className="sg-field sg-field--wide">
          <span>Command note (optional)</span>
          <input
            type="text"
            maxLength={240}
            value={approvalNote}
            placeholder="Why this plan is being approved"
            onChange={(change) => setApprovalNote(change.target.value)}
          />
        </label>
        <button
          className="sg-button"
          disabled={!sdk.isReady || busy || isApproved || plan.gate_status === 'blocked'}
          onClick={() => void approvePlan()}
        >
          {busy
            ? 'Recording…'
            : isApproved
              ? 'Approval recorded'
              : plan.gate_status === 'blocked'
                ? 'Resolve safety block first'
                : 'Approve for simulation'}
        </button>
      </section>
      {actionMessage ? <p className="sg-action-status" role="status">{actionMessage}</p> : null}

      <div className="sg-grid-2">
        <Panel title="Action sequence" meta={`${data.actions.length} controlled steps`}>
          <div className="sg-timeline">
            {data.actions.map((action) => (
              <div className="sg-step" key={action.order}>
                <span className={`sg-step-index ${action.status === 'ready' ? 'sg-step-index--done' : 'sg-step-index--running'}`}>{action.order}</span>
                <div>
                  <p className="sg-step-title">{action.action}</p>
                  <p className="sg-step-owner">{action.owner}</p>
                </div>
                <span className={statusClass(action.status)}>{action.status}</span>
              </div>
            ))}
          </div>
        </Panel>

        <div style={{ display: 'grid', gap: 14 }}>
          <Panel title="Allocations" meta="Planned">
            <div className="sg-list">
              <div className="sg-mini-grid">
                <div className="sg-mini-stat"><span>Beds opened</span><strong>{data.allocations.beds}</strong></div>
                <div className="sg-mini-stat"><span>Staff assignments</span><strong>{data.allocations.staff_assignments}</strong></div>
                <div className="sg-mini-stat"><span>Transfers</span><strong>{data.allocations.transfers}</strong></div>
                <div className="sg-mini-stat"><span>Devices</span><strong>{data.allocations.devices}</strong></div>
              </div>
            </div>
          </Panel>
          <Panel title="Approval workflow" meta={plan.status.replace('_', ' ')}>
            <div className="sg-list">
              {data.approvals.map((approval) => (
                <div className="sg-list-item" key={approval.role}>
                  <div className="sg-list-item-head">
                    <h4>{approval.role}</h4>
                    <span className={statusClass(approval.status === 'approved' ? 'ready' : approval.status)}>{approval.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <div className="sg-alert" style={{ marginTop: 14 }}>
        <div>
          <p className="sg-alert-title">Assumption boundary</p>
          <p className="sg-alert-text">{plan.assumptions.join(' · ')}</p>
        </div>
      </div>
    </WidgetShell>
  );
}
