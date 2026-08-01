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

interface QueueData {
  system_pressure: {
    status: string;
    score: number;
    active_patients: number;
    service_level_breaches: number;
    longest_wait_minutes: number;
  };
  queues: Array<{
    name: string;
    active: number;
    breach_count: number;
    average_wait_minutes: number;
    p90_wait_minutes: number;
    longest_wait_minutes: number;
    trend_percent: number;
    status: string;
  }>;
  freshness: { age_seconds: number; status: string };
}

const fallback: ToolEnvelope<QueueData> = {
  ok: true,
  correlation_id: 'demo-queue',
  data: {
    system_pressure: { status: 'critical', score: 87, active_patients: 73, service_level_breaches: 18, longest_wait_minutes: 244 },
    queues: [
      { name: 'ED · Waiting for provider', active: 31, breach_count: 11, average_wait_minutes: 82, p90_wait_minutes: 148, longest_wait_minutes: 192, trend_percent: 18, status: 'critical' },
      { name: 'ED · Admission hold', active: 17, breach_count: 5, average_wait_minutes: 136, p90_wait_minutes: 221, longest_wait_minutes: 244, trend_percent: 12, status: 'critical' },
      { name: 'Imaging', active: 14, breach_count: 2, average_wait_minutes: 47, p90_wait_minutes: 73, longest_wait_minutes: 96, trend_percent: -6, status: 'strained' },
      { name: 'Discharge transport', active: 11, breach_count: 0, average_wait_minutes: 29, p90_wait_minutes: 41, longest_wait_minutes: 55, trend_percent: -9, status: 'watch' },
    ],
    freshness: { age_seconds: 74, status: 'current' },
  },
};

export default function QueuePressure() {
  const { data } = useLiveWidgetData(fallback, 'queue');
  const { callTool, isReady } = useWidgetSDK();
  const [clearCount, setClearCount] = useState(25);
  const [busy, setBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const pressure = data.system_pressure;

  async function recordQueueCompletions() {
    const count = Math.max(1, Math.min(420, Math.round(clearCount)));
    setBusy(true);
    setActionMessage(`Recording ${count} completed queue steps…`);
    try {
      await callTool('surge_command_center', {
        action: 'apply_scenario',
        queue_completions: count,
      });
      setActionMessage('Queue completions recorded. Pressure, breaches and plan forecasts are recalculating.');
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'The patient-flow update could not be applied.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <WidgetShell
      eyebrow="Patient flow"
      title="Queue pressure"
      subtitle="Wait distributions and service-level breaches are shown without patient-identifiable detail."
      status={pressure.status}
      freshness={`${data.freshness.age_seconds}s old · ${data.freshness.status}`}
    >
      <div className="sg-kpi-grid">
        <Kpi label="Pressure score" value={`${pressure.score}/100`} note="Critical threshold ≥ 80" />
        <Kpi label="Active patients" value={pressure.active_patients} note="Across monitored queues" />
        <Kpi label="SLA breaches" value={pressure.service_level_breaches} note="Requires command attention" />
        <Kpi label="Longest wait" value={`${pressure.longest_wait_minutes}m`} note="ED admission hold" />
      </div>

      <section className="sg-action-strip" aria-label="Patient-flow action">
        <div>
          <p className="sg-action-title">Record completed queue steps</p>
          <p className="sg-action-copy">Use this when patients have completed provider, admission, imaging or transport steps.</p>
        </div>
        <label className="sg-field sg-field--number">
          <span>Completed steps</span>
          <input
            type="number"
            min={1}
            max={420}
            value={clearCount}
            onChange={(change) => setClearCount(Number(change.target.value))}
          />
        </label>
        <button className="sg-button" disabled={!isReady || busy || clearCount < 1} onClick={() => void recordQueueCompletions()}>
          {busy ? 'Recording…' : 'Update patient flow'}
        </button>
      </section>
      {actionMessage ? <p className="sg-action-status" role="status">{actionMessage}</p> : null}

      <Panel title="Queue detail" meta="Current snapshot">
        <div className="sg-panel-body">
          {data.queues.map((queue) => (
            <div className="sg-row" key={queue.name}>
              <div>
                <p className="sg-row-title">{queue.name}</p>
                <p className="sg-row-subtitle">{queue.active} active · {queue.breach_count} breaches · trend {queue.trend_percent > 0 ? '+' : ''}{queue.trend_percent}%</p>
              </div>
              <div className="sg-metric">
                <strong>{queue.average_wait_minutes}m / {queue.p90_wait_minutes}m</strong>
                <span>average / p90 wait</span>
              </div>
              <div>
                <div className={`sg-progress ${queue.status === 'critical' ? 'sg-progress--danger' : 'sg-progress--warning'}`} style={progressStyle(Math.min(100, queue.p90_wait_minutes / 2.4))}>
                  <span />
                </div>
                <div className="sg-inline" style={{ justifyContent: 'space-between', marginTop: 6 }}>
                  <span className="sg-panel-meta">max {queue.longest_wait_minutes}m</span>
                  <span className={statusClass(queue.status)}>{queue.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </WidgetShell>
  );
}
