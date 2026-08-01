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

interface IncidentData {
  incident: {
    incident_number: string;
    name: string;
    severity: string;
    status: string;
    command_lead: string;
    primary_facility: string;
    situation_summary: string;
  };
  operational_period: {
    period_number: number;
    starts_at: string;
    ends_at: string;
    next_briefing_at: string;
  };
  objectives: Array<{ label: string; progress: number; status: string }>;
  tasks: Array<{ label: string; owner: string; due_at: string; status: string }>;
}

const fallback: ToolEnvelope<IncidentData> = {
  ok: true,
  correlation_id: 'demo-incident',
  data: {
    incident: {
      incident_number: 'SG-2026-0725',
      name: 'Metro respiratory surge',
      severity: 'level_3',
      status: 'activated',
      command_lead: 'Dr. Maya Iyer',
      primary_facility: 'Care360 Central',
      situation_summary: 'Respiratory arrivals are 34% above forecast with ICU and ED boarding constraints.',
    },
    operational_period: {
      period_number: 3,
      starts_at: '2026-07-25T15:40:00.000Z',
      ends_at: '2026-07-25T21:40:00.000Z',
      next_briefing_at: '2026-07-25T18:10:00.000Z',
    },
    objectives: [
      { label: 'Reduce ED admission holds below 12', progress: 42, status: 'at_risk' },
      { label: 'Open 8 policy-cleared surge beds', progress: 75, status: 'on_track' },
      { label: 'Close critical RN coverage gap', progress: 38, status: 'blocked' },
    ],
    tasks: [
      { label: 'Validate negative-pressure rooms', owner: 'Facilities', due_at: '2026-07-25T17:35:00.000Z', status: 'in_progress' },
      { label: 'Confirm ICU float pool credentials', owner: 'Nursing Ops', due_at: '2026-07-25T17:50:00.000Z', status: 'blocked' },
      { label: 'Activate discharge lounge transport', owner: 'Patient Flow', due_at: '2026-07-25T17:30:00.000Z', status: 'completed' },
    ],
  },
};

function time(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  }).format(new Date(value));
}

export default function IncidentBrief() {
  const { data } = useLiveWidgetData(fallback, 'incident');
  const { callTool, isReady } = useWidgetSDK();
  const [event, setEvent] = useState<'arrival_spike' | 'staff_callout' | 'beds_cleaned' | 'discharge_wave'>('arrival_spike');
  const [busy, setBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const incident = data.incident;
  const period = data.operational_period;
  const openTasks = data.tasks.filter((task) => task.status !== 'completed').length;
  const blockedObjectives = data.objectives.filter((objective) => objective.status === 'blocked').length;

  async function applySituationUpdate() {
    setBusy(true);
    setActionMessage('Applying the scenario update to every connected tool…');
    try {
      await callTool('simulate_surge_change', { event });
      setActionMessage('Situation updated. Objectives, capacity, queues, staffing and plan eligibility are recalculating.');
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'The situation update could not be applied.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <WidgetShell
      eyebrow="Live incident"
      title={incident.name}
      subtitle={incident.situation_summary}
      freshness={`Next command briefing at ${time(period.next_briefing_at)}`}
    >
      <div className="sg-kpi-grid sg-kpi-grid--two">
        <Kpi label="Open tasks" value={openTasks} note={`${data.tasks.length} in this period`} />
        <Kpi label="Blocked objectives" value={blockedObjectives} note={`Period ends ${time(period.ends_at)}`} />
      </div>

      <section className="sg-action-strip" aria-label="Incident simulation control">
        <div>
          <p className="sg-action-title">Record a command scenario</p>
          <p className="sg-action-copy">Apply one confirmed demo event and synchronize every operational and decision tool.</p>
        </div>
        <label className="sg-field">
          <span>Scenario</span>
          <select value={event} onChange={(change) => setEvent(change.target.value as typeof event)}>
            <option value="arrival_spike">18 new arrivals</option>
            <option value="staff_callout">3 ED RN callouts</option>
            <option value="beds_cleaned">10 beds cleaned</option>
            <option value="discharge_wave">12 patient discharges</option>
          </select>
        </label>
        <button className="sg-button" disabled={!isReady || busy} onClick={() => void applySituationUpdate()}>
          {busy ? 'Applying…' : 'Apply situation update'}
        </button>
      </section>
      {actionMessage ? <p className="sg-action-status" role="status">{actionMessage}</p> : null}

      <div className="sg-grid-2">
        <Panel title="Operational objectives" meta={`Period ${period.period_number}`}>
          <div className="sg-panel-body">
            {data.objectives.map((objective) => (
              <div className="sg-row" key={objective.label}>
                <div>
                  <p className="sg-row-title" style={{ whiteSpace: 'normal', overflow: 'visible' }}>{objective.label}</p>
                  <p className="sg-row-subtitle">{objective.progress}% complete</p>
                </div>
                <div className="sg-metric">
                  <strong>{objective.progress}%</strong>
                  <span>progress</span>
                </div>
                <div>
                  <div className={`sg-progress ${objective.status === 'blocked' ? 'sg-progress--danger' : objective.status === 'at_risk' ? 'sg-progress--warning' : ''}`} style={progressStyle(objective.progress)}>
                    <span />
                  </div>
                  <div className="sg-inline" style={{ justifyContent: 'flex-end', marginTop: 6 }}>
                    <span className={statusClass(objective.status)}>{objective.status.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Next actions" meta="Owner / due">
          <div className="sg-list">
            {data.tasks.map((task) => (
              <article className="sg-list-item" key={task.label}>
                <div className="sg-list-item-head">
                  <h4>{task.label}</h4>
                  <span className={statusClass(task.status)}>{task.status.replace('_', ' ')}</span>
                </div>
                <p>{task.owner} · due {time(task.due_at)}</p>
              </article>
            ))}
          </div>
        </Panel>
      </div>
    </WidgetShell>
  );
}
