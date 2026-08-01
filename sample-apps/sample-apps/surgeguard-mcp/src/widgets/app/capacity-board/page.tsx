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

interface CapacityData {
  summary: {
    occupied: number;
    staffed_capacity: number;
    licensed_capacity: number;
    available: number;
    held: number;
    cleaning: number;
    blocked: number;
    occupancy_percent: number;
    surge_spaces_ready: number;
  };
  locations: Array<{
    name: string;
    code: string;
    occupied: number;
    capacity: number;
    licensed_capacity: number;
    occupancy_percent: number;
    available: number;
    cleaning: number;
    held: number;
    blocked: number;
    status: string;
  }>;
  freshness: { as_of: string; age_seconds: number; status: string };
}

const fallback: ToolEnvelope<CapacityData> = {
  ok: true,
  correlation_id: 'demo-capacity',
  data: {
    summary: {
      occupied: 287,
      staffed_capacity: 316,
      licensed_capacity: 342,
      available: 18,
      held: 6,
      cleaning: 5,
      blocked: 26,
      occupancy_percent: 90.8,
      surge_spaces_ready: 12,
    },
    locations: [
      { name: 'Emergency Department', code: 'ED', occupied: 54, capacity: 56, licensed_capacity: 58, occupancy_percent: 96, available: 1, cleaning: 1, held: 0, blocked: 2, status: 'critical' },
      { name: 'Intensive Care Unit', code: 'ICU', occupied: 30, capacity: 32, licensed_capacity: 32, occupancy_percent: 94, available: 1, cleaning: 1, held: 0, blocked: 0, status: 'critical' },
      { name: 'Step-down Unit', code: 'SDU', occupied: 38, capacity: 42, licensed_capacity: 44, occupancy_percent: 90, available: 3, cleaning: 1, held: 0, blocked: 2, status: 'strained' },
      { name: 'Medical / Surgical', code: 'MS', occupied: 165, capacity: 186, licensed_capacity: 208, occupancy_percent: 89, available: 13, cleaning: 2, held: 6, blocked: 22, status: 'strained' },
    ],
    freshness: { as_of: new Date().toISOString(), age_seconds: 118, status: 'current' },
  },
};

export default function CapacityBoard() {
  const { data } = useLiveWidgetData(fallback, 'capacity');
  const { callTool, isReady } = useWidgetSDK();
  const [busy, setBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const summary = data.summary;
  const licensedHeadroom = summary.licensed_capacity - summary.staffed_capacity;
  const staffedReconciliation =
    summary.occupied + summary.available + summary.cleaning + summary.held;
  const capacityStatus =
    summary.occupancy_percent >= 92
      ? 'critical'
      : summary.occupancy_percent >= 85
        ? 'strained'
        : summary.occupancy_percent >= 75
          ? 'watch'
          : 'ready';
  const bedsToReturn = Math.min(summary.cleaning, 30);

  async function returnCleanedBeds() {
    setBusy(true);
    setActionMessage(`Returning ${bedsToReturn} cleaned bed${bedsToReturn === 1 ? '' : 's'} to service…`);
    try {
      await callTool('surge_command_center', {
        action: 'apply_scenario',
        beds_cleaned: bedsToReturn,
      });
      setActionMessage('Cleaned beds were returned to usable capacity. Connected views are synchronizing.');
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'The capacity update could not be applied.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <WidgetShell
      eyebrow="Live capacity"
      title="Capacity command board"
      subtitle="Staffed capacity is the operational ceiling. Licensed beds are shown for context, never treated as immediately usable."
      status={capacityStatus}
      freshness={`${data.freshness.age_seconds}s old · ${data.freshness.status}`}
    >
      <div className="sg-kpi-grid">
        <Kpi label="Staffed occupancy" value={`${summary.occupancy_percent}%`} note={`${summary.occupied} occupied of ${summary.staffed_capacity} staffed`} />
        <Kpi label="Usable now" value={summary.available} note={`${summary.cleaning} cleaning · ${summary.held} held`} />
        <Kpi label="Unstaffed licensed beds" value={licensedHeadroom} note={`${summary.licensed_capacity} licensed − ${summary.staffed_capacity} staffed`} />
        <Kpi label="Surge-ready subset" value={summary.surge_spaces_ready} note={`Selected from ${summary.available + summary.cleaning} available + cleaning`} />
      </div>

      <section className="sg-action-strip" aria-label="Capacity action">
        <div>
          <p className="sg-action-title">Release cleaned capacity</p>
          <p className="sg-action-copy">Move the {bedsToReturn} beds currently in cleaning into immediately usable staffed capacity.</p>
        </div>
        <div className="sg-action-impact">
          <span>Usable after action</span>
          <strong>{summary.available + bedsToReturn}</strong>
        </div>
        <button className="sg-button" disabled={!isReady || busy || bedsToReturn === 0} onClick={() => void returnCleanedBeds()}>
          {busy ? 'Releasing…' : bedsToReturn ? `Release ${bedsToReturn} beds` : 'No beds ready'}
        </button>
      </section>
      {actionMessage ? <p className="sg-action-status" role="status">{actionMessage}</p> : null}

      <Panel
        title="Capacity by unit / room"
        meta={`${summary.occupied} occupied + ${summary.available} available + ${summary.cleaning} cleaning + ${summary.held} held = ${staffedReconciliation} staffed`}
      >
        <div className="sg-panel-body">
          {data.locations.map((location) => (
            <div className="sg-row" key={location.code}>
              <div>
                <div className="sg-location-heading">
                  <span className="sg-location-code">{location.code}</span>
                  <p className="sg-row-title">{location.name}</p>
                </div>
                <p className="sg-row-subtitle">
                  {location.available} available · {location.cleaning} cleaning · {location.held} held · {location.blocked} unstaffed
                </p>
              </div>
              <div className="sg-metric">
                <strong>{location.occupied}/{location.capacity}</strong>
                <span>occupied / staffed</span>
              </div>
              <div>
                <div
                  className={`sg-progress ${
                    location.status === 'critical'
                      ? 'sg-progress--danger'
                      : location.status === 'ready'
                        ? ''
                        : 'sg-progress--warning'
                  }`}
                  style={progressStyle(location.occupancy_percent)}
                >
                  <span />
                </div>
                <div className="sg-inline" style={{ justifyContent: 'space-between', marginTop: 6 }}>
                  <span className="sg-panel-meta">{location.occupancy_percent}%</span>
                  <span className={statusClass(location.status)}>{location.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </WidgetShell>
  );
}
