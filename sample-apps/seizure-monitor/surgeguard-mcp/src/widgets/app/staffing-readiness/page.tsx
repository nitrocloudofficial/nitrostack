'use client';

import { useState } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import {
  Kpi,
  Panel,
  ToolEnvelope,
  WidgetShell,
  progressStyle,
  statusClass,
  useLiveWidgetData,
} from '../../components/widget-shell';

interface StaffingData {
  coverage: Array<{
    role: string;
    required: number;
    assigned: number;
    eligible: number;
    gap: number;
    coverage_percent: number;
    status: string;
  }>;
  eligible_practitioners: {
    total: number;
    on_shift: number;
    available_on_call: number;
    restricted: number;
    fatigue_risk: number;
  };
  gaps: Array<{
    role: string;
    count: number;
    hard_constraint: boolean;
    reason: string;
  }>;
  freshness: { age_seconds: number; status: string };
}

const fallback: ToolEnvelope<StaffingData> = {
  ok: true,
  correlation_id: 'demo-staffing',
  data: {
    coverage: [
      { role: 'Emergency RN', required: 26, assigned: 23, eligible: 21, gap: 5, coverage_percent: 81, status: 'blocked' },
      { role: 'Critical Care RN', required: 14, assigned: 13, eligible: 12, gap: 2, coverage_percent: 86, status: 'strained' },
      { role: 'Respiratory Therapist', required: 7, assigned: 7, eligible: 7, gap: 0, coverage_percent: 100, status: 'ready' },
      { role: 'Hospitalist', required: 9, assigned: 9, eligible: 8, gap: 1, coverage_percent: 89, status: 'watch' },
    ],
    eligible_practitioners: { total: 74, on_shift: 62, available_on_call: 12, restricted: 4, fatigue_risk: 3 },
    gaps: [
      { role: 'Emergency RN', count: 5, hard_constraint: true, reason: 'Two assignments lack current trauma competency; three positions are unfilled.' },
      { role: 'Critical Care RN', count: 2, hard_constraint: true, reason: 'ICU privilege and fatigue checks leave twelve eligible staff.' },
    ],
    freshness: { age_seconds: 241, status: 'current' },
  },
};

export default function StaffingReadiness() {
  const { data } = useLiveWidgetData(fallback, 'staffing');
  const { callTool, isReady } = useWidgetSDK();
  const [recallCount, setRecallCount] = useState(3);
  const [busy, setBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const eligible = data.eligible_practitioners;
  const largestGap = Math.max(...data.coverage.map((item) => item.gap));
  const totalGap = data.gaps.reduce((sum, gap) => sum + gap.count, 0);

  async function recordQualifiedRecall() {
    const count = Math.max(1, Math.min(12, Math.round(recallCount)));
    setBusy(true);
    setActionMessage(`Adding ${count} qualified ED RN${count === 1 ? '' : 's'} to the simulated shift…`);
    try {
      await callTool('surge_command_center', {
        action: 'apply_scenario',
        rn_change: count,
      });
      setActionMessage('Qualified coverage updated. Safety gates and plan eligibility are recalculating.');
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'The staffing update could not be applied.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <WidgetShell
      eyebrow="Workforce safety"
      title="Staffing readiness"
      subtitle="Assigned headcount is separated from policy-eligible coverage after license, competency, privilege, restriction and fatigue checks."
      status={largestGap > 0 ? 'blocked' : 'ready'}
      freshness={`${data.freshness.age_seconds}s old · ${data.freshness.status}`}
    >
      <div className="sg-kpi-grid">
        <Kpi label="Eligible workforce" value={eligible.total} note={`${eligible.on_shift} currently on shift`} />
        <Kpi label="On-call available" value={eligible.available_on_call} note="Passed current eligibility checks" />
        <Kpi label="Restricted" value={eligible.restricted} note="Not counted as eligible" />
        <Kpi label="Fatigue risk" value={eligible.fatigue_risk} note="Requires assignment review" />
      </div>

      <section className="sg-action-strip" aria-label="Staffing action">
        <div>
          <p className="sg-action-title">Record qualified staff recall</p>
          <p className="sg-action-copy">Add verified ED RNs to the simulated shift and immediately re-evaluate plan safety.</p>
        </div>
        <label className="sg-field sg-field--number">
          <span>Qualified RNs</span>
          <input
            type="number"
            min={1}
            max={12}
            value={recallCount}
            onChange={(change) => setRecallCount(Number(change.target.value))}
          />
        </label>
        <button className="sg-button" disabled={!isReady || busy || recallCount < 1} onClick={() => void recordQualifiedRecall()}>
          {busy ? 'Updating…' : `Recall ${Math.min(12, Math.max(1, recallCount || 1))} qualified RNs`}
        </button>
      </section>
      <p className="sg-action-status" role="status">
        {actionMessage ?? `${totalGap} policy-eligible position${totalGap === 1 ? '' : 's'} remain open before this action.`}
      </p>

      <div className="sg-grid-2">
        <Panel title="Coverage by critical role" meta="Eligible / required">
          <div className="sg-panel-body">
            {data.coverage.map((role) => (
              <div className="sg-row" key={role.role}>
                <div>
                  <p className="sg-row-title">{role.role}</p>
                  <p className="sg-row-subtitle">{role.assigned} assigned · {role.eligible} policy-eligible</p>
                </div>
                <div className="sg-metric">
                  <strong>{role.eligible}/{role.required}</strong>
                  <span>{role.gap ? `${role.gap} gap` : 'fully covered'}</span>
                </div>
                <div>
                  <div className={`sg-progress ${role.status === 'blocked' ? 'sg-progress--danger' : role.status === 'ready' ? '' : 'sg-progress--warning'}`} style={progressStyle(role.coverage_percent)}>
                    <span />
                  </div>
                  <div className="sg-inline" style={{ justifyContent: 'flex-end', marginTop: 6 }}>
                    <span className={statusClass(role.status)}>{role.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Blocking coverage gaps" meta={`${data.gaps.length} open`}>
          <div className="sg-list">
            {data.gaps.map((gap) => (
              <div className="sg-alert sg-alert--danger" key={gap.role}>
                <div>
                  <p className="sg-alert-title">{gap.count} × {gap.role}</p>
                  <p className="sg-alert-text">{gap.reason}</p>
                  <p className="sg-alert-text">{gap.hard_constraint ? 'Hard constraint · execution blocked' : 'Soft constraint · mitigation required'}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </WidgetShell>
  );
}
