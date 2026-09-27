import { useMemo, useState } from 'react';
import { useFocusContext } from '../FocusContext';
import { useWorkbenchData } from '../WorkbenchDataContext';

const time = (timestamp: string) => new Intl.DateTimeFormat('en-IN', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'UTC',
}).format(new Date(timestamp));

export function TimelinePanel() {
  const { focus, focusEvent } = useFocusContext();
  const { data } = useWorkbenchData();
  const { incidentEvents } = data;
  const [source, setSource] = useState('all');
  const [severity, setSeverity] = useState('all');

  const visible = useMemo(() => incidentEvents.filter((event) => (
    (source === 'all' || event.category === source)
    && (severity === 'all' || event.severity === severity)
  )), [source, severity]);

  return (
    <section className="module-panel timeline-panel">
      <header className="module-header">
        <div>
          <h2>Incident timeline</h2>
          <span>Unified events across MES, sensors, maintenance, and quality</span>
        </div>
        <div className="module-actions">
          <label className="mini-select">
            <span>Source</span>
            <select value={source} onChange={(event) => setSource(event.target.value)}>
              <option value="all">All</option>
              <option value="sensor">Sensors</option>
              <option value="queue">Queue</option>
              <option value="maintenance">Maintenance</option>
              <option value="inspection">Quality</option>
              <option value="system">MES</option>
            </select>
          </label>
          <label className="mini-select">
            <span>Severity</span>
            <select value={severity} onChange={(event) => setSeverity(event.target.value)}>
              <option value="all">All</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
          </label>
        </div>
      </header>

      <div className="timeline-scroll">
        <div className="timeline-track">
          {visible.map((event) => {
            const active = focus.eventId === event.id;
            const aiActive = active && focus.origin === 'assistant';
            return (
              <button
                key={event.id}
                className={`timeline-item severity-${event.severity}${active ? ' active' : ''}${aiActive ? ' ai-active' : ''}`}
                onClick={() => focusEvent(event.id)}
                aria-pressed={active}
              >
                <span className="timeline-time">{time(event.timestamp)}</span>
                <i className="timeline-marker" />
                <span className="timeline-card">
                  <small>{event.source}</small>
                  <strong>{event.label}</strong>
                  <em>{event.value}</em>
                  <span>{Math.round(event.confidence * 100)}% confidence</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="timeline-legend">
        <span><i className="dot info" /> Informational</span>
        <span><i className="dot warning" /> Warning</span>
        <span><i className="dot critical" /> Critical</span>
        <span className="legend-note">Select any event to synchronize replay, graph, and evidence.</span>
      </div>
    </section>
  );
}
