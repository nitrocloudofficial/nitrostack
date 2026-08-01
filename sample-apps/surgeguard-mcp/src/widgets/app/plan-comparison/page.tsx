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

interface CandidatePlan {
  candidate_plan_id: string;
  name: string;
  rank: number;
  gate_status: string;
  wait_reduction_percent: number;
  safety_score: number;
  staffing_gap: number;
  beds_opened: number;
  time_to_effect_minutes: number;
  cost_index: number;
  recommendation: string;
  eligibility_reason?: string;
}

interface ComparisonData {
  comparison: CandidatePlan[];
  dominance: {
    preferred_plan_id: string;
    rationale: string;
    blocked_plan_ids: string[];
  };
  tradeoffs: string[];
}

interface PlanReviewData {
  plan: {
    candidate_plan_id: string;
    name: string;
    gate_status: string;
    assumptions: string[];
  };
  actions: Array<{ order: number; action: string; owner: string; status: string }>;
  allocations: { beds: number; staff_assignments: number; transfers: number; devices: number };
  scores: { safety: number; wait_reduction: number; time_to_effect_minutes: number; cost_index: number };
}

const fallback: ToolEnvelope<ComparisonData> = {
  ok: true,
  correlation_id: 'demo-comparison',
  data: {
    comparison: [
      { candidate_plan_id: 'plan-a', name: 'Balanced decompression', rank: 1, gate_status: 'conditional', wait_reduction_percent: 23, safety_score: 96, staffing_gap: 0, beds_opened: 8, time_to_effect_minutes: 38, cost_index: 1.14, recommendation: 'best_safe_tradeoff', eligibility_reason: 'Current staffing requires an assigned mitigation.' },
      { candidate_plan_id: 'plan-b', name: 'Fast capacity release', rank: 2, gate_status: 'blocked', wait_reduction_percent: 31, safety_score: 71, staffing_gap: 5, beds_opened: 14, time_to_effect_minutes: 24, cost_index: 1.08, recommendation: 'ineligible', eligibility_reason: 'Qualified staffing is below the minimum for rapid bed activation.' },
      { candidate_plan_id: 'plan-c', name: 'Transfer-first', rank: 3, gate_status: 'clear', wait_reduction_percent: 17, safety_score: 99, staffing_gap: 0, beds_opened: 4, time_to_effect_minutes: 62, cost_index: 1.32, recommendation: 'safe_alternative', eligibility_reason: 'Current conditions support transfer-first.' },
    ],
    dominance: {
      preferred_plan_id: 'plan-a',
      rationale: 'Highest-priority currently eligible response.',
      blocked_plan_ids: ['plan-b'],
    },
    tradeoffs: [],
  },
};

function decisionLabel(status: string) {
  if (status === 'blocked') return 'Unavailable';
  if (status === 'conditional') return 'Ready with condition';
  return 'Ready';
}

export default function PlanComparison() {
  // Planning is intentionally snapshot-based. Live operational views continue
  // updating, but a decision under review must not silently re-rank itself.
  const { data } = useWidgetData(fallback);
  const { callTool, isReady } = useWidgetSDK();
  const [selectedPlanId, setSelectedPlanId] = useState(
    data.dominance.preferred_plan_id,
  );
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [reviewingPlanId, setReviewingPlanId] = useState<string | null>(null);
  const [review, setReview] = useState<PlanReviewData | null>(null);
  const requestedId = selectedPlanId;
  const requestedPlan = data.comparison.find((plan) => plan.candidate_plan_id === requestedId);
  const selectedId = requestedPlan && requestedPlan.gate_status !== 'blocked'
    ? requestedId
    : data.dominance.preferred_plan_id;
  const selected = data.comparison.find((plan) => plan.candidate_plan_id === selectedId) ?? data.comparison[0];
  const eligiblePlans = data.comparison.filter((plan) => plan.gate_status !== 'blocked').length;
  const isRecommended = selectedId === data.dominance.preferred_plan_id;

  function planChoice(plan: CandidatePlan) {
    const normalized = plan.name.toLowerCase();
    if (normalized.includes('transfer')) return 'transfer_first';
    if (normalized.includes('fast')) return 'fast_capacity_release';
    return 'balanced_decompression';
  }

  async function openPlanReview(plan: CandidatePlan) {
    setSelectedPlanId(plan.candidate_plan_id);
    setReviewingPlanId(plan.candidate_plan_id);
    setActionMessage(`Loading the actions and assumptions for ${plan.name}...`);
    try {
      const result = await callTool('review_surge_plan', {
        plan: planChoice(plan),
      });
      const next = findToolEnvelope<PlanReviewData>(result);
      if (!next) throw new Error('The review tool returned an unreadable response.');
      setReview(next.data);
      setActionMessage(`${plan.name} is open below. Nothing has been approved or executed.`);
    } catch (error) {
      setActionMessage(
        error instanceof Error
          ? error.message
          : 'The review could not be loaded. Your selected plan has not been approved or executed.',
      );
    } finally {
      setReviewingPlanId(null);
    }
  }

  return (
    <WidgetShell
      eyebrow="Locked planning snapshot"
      title="Choose one response plan"
      subtitle="This recommendation is fixed to the conditions captured when the plans were generated. It will not change while you compare or review it."
      status={selected.gate_status}
      freshness={`Snapshot locked · ${eligiblePlans} of ${data.comparison.length} plans available`}
    >
      <div className="sg-kpi-grid">
        <Kpi label="Selected plan" value={`#${selected.rank}`} note={selected.name} />
        <Kpi label="Safety" value={`${selected.safety_score}/100`} note={decisionLabel(selected.gate_status)} />
        <Kpi label="Expected wait reduction" value={`${selected.wait_reduction_percent}%`} note={`Begins in about ${selected.time_to_effect_minutes} minutes`} />
        <Kpi label="Available choices" value={eligiblePlans} note={`${data.comparison.length - eligiblePlans} currently unavailable`} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12, marginBottom: 14 }}>
        {data.comparison.map((plan) => {
          const blocked = plan.gate_status === 'blocked';
          const isSelected = plan.candidate_plan_id === selectedId;
          const optionLabel = plan.candidate_plan_id === data.dominance.preferred_plan_id
            ? 'Recommended'
            : blocked
              ? 'Unavailable'
              : 'Alternative';

          return (
            <article className={`sg-plan-card ${isSelected ? 'sg-plan-card--selected' : ''}`} key={plan.candidate_plan_id}>
              <div className="sg-list-item-head">
                <div>
                  <p className="sg-eyebrow" style={{ marginBottom: 4 }}>{optionLabel}</p>
                  <h3>{plan.name}</h3>
                </div>
                <span className={statusClass(plan.gate_status)}>{decisionLabel(plan.gate_status)}</span>
              </div>
              <div className="sg-mini-grid">
                <div className="sg-mini-stat"><span>Expected relief</span><strong>{plan.wait_reduction_percent}%</strong></div>
                <div className="sg-mini-stat"><span>Safety</span><strong>{plan.safety_score}</strong></div>
                <div className="sg-mini-stat"><span>Starts helping</span><strong>{plan.time_to_effect_minutes}m</strong></div>
                <div className="sg-mini-stat"><span>Relative cost</span><strong>{plan.cost_index.toFixed(2)}×</strong></div>
              </div>
              <p className="sg-plan-reason">
                {plan.eligibility_reason ?? 'No unresolved safety requirement prevents review.'}
              </p>
              <button
                className={`sg-button ${blocked ? 'sg-button--secondary' : ''}`}
                disabled={blocked || !isReady || reviewingPlanId !== null}
                onClick={() => void openPlanReview(plan)}
                title={blocked ? 'A required condition is not met' : `Review ${plan.name}`}
                style={blocked ? { cursor: 'not-allowed', opacity: 0.55 } : undefined}
              >
                {blocked
                  ? 'Unavailable — requirement not met'
                  : reviewingPlanId === plan.candidate_plan_id
                    ? 'Loading review…'
                    : 'Review this plan'}
              </button>
            </article>
          );
        })}
      </div>
      {actionMessage ? (
        <p className="sg-panel-meta" role="status" style={{ margin: '0 0 14px' }}>
          {actionMessage}
        </p>
      ) : null}

      {review ? (
        <Panel title={`${review.plan.name} review`} meta="Loaded directly from the review tool">
          <div className="sg-action-review">
            <div className="sg-timeline">
              {review.actions.map((action) => (
                <div className="sg-step" key={action.order}>
                  <span className={`sg-step-index ${action.status === 'ready' ? 'sg-step-index--done' : 'sg-step-index--running'}`}>
                    {action.order}
                  </span>
                  <div>
                    <p className="sg-step-title">{action.action}</p>
                    <p className="sg-step-owner">{action.owner}</p>
                  </div>
                  <span className={statusClass(action.status)}>{action.status.replaceAll('_', ' ')}</span>
                </div>
              ))}
            </div>
            <div className="sg-review-summary">
              <div className="sg-mini-grid">
                <div className="sg-mini-stat"><span>Beds</span><strong>{review.allocations.beds}</strong></div>
                <div className="sg-mini-stat"><span>Staff</span><strong>{review.allocations.staff_assignments}</strong></div>
                <div className="sg-mini-stat"><span>Transfers</span><strong>{review.allocations.transfers}</strong></div>
                <div className="sg-mini-stat"><span>Devices</span><strong>{review.allocations.devices}</strong></div>
              </div>
              <div className="sg-alert">
                <div>
                  <p className="sg-alert-title">Assumptions to verify</p>
                  <p className="sg-alert-text">{review.plan.assumptions.join(' · ')}</p>
                </div>
              </div>
            </div>
          </div>
        </Panel>
      ) : null}

      <div className="sg-grid-2">
        <Panel title={isRecommended ? 'Why this plan is recommended' : 'Why this plan is available'} meta="For this snapshot">
          <div className="sg-list">
            <div className="sg-alert">
              <div>
                <p className="sg-alert-title">{selected.name}</p>
                <p className="sg-alert-text">
                  {isRecommended
                    ? 'It is the highest-priority option that is currently available without an unresolved safety block.'
                    : 'It remains a safe alternative for this snapshot, but it is not the current first recommendation.'}
                </p>
              </div>
            </div>
            <article className="sg-list-item">
              <h4>Current condition</h4>
              <p>{selected.eligibility_reason ?? 'No unresolved safety requirement prevents review.'}</p>
            </article>
          </div>
        </Panel>

        <Panel title="What the three choices do" meta="Plain-language summary">
          <div className="sg-list">
            <article className="sg-list-item">
              <h4>Balanced decompression</h4>
              <p>Combines beds, staffing and discharge actions for moderate, lower-risk relief.</p>
            </article>
            <article className="sg-list-item">
              <h4>Transfer-first</h4>
              <p>Moves suitable patients to receiving facilities; safer but slower and dependent on acceptance.</p>
            </article>
            <article className="sg-list-item">
              <h4>Fast capacity release</h4>
              <p>Opens capacity fastest, but is unavailable whenever qualified staffing is below minimum.</p>
            </article>
          </div>
        </Panel>
      </div>
    </WidgetShell>
  );
}
