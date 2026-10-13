import { useMemo } from 'react';
import { useFocusContext } from '../FocusContext';
import { useWorkbenchData } from '../WorkbenchDataContext';

const formatTimestamp = (timestamp: string) => new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'UTC',
}).format(new Date(timestamp));

export function EvidencePanel() {
  const { focus } = useFocusContext();
  const { data } = useWorkbenchData();
  const { evidenceRecords, graphNodes, incidentEvents } = data;
  const records = useMemo(
    () => evidenceRecords.filter((record) => focus.evidenceIds.includes(record.id)),
    [focus.evidenceIds],
  );
  const event = incidentEvents.find((item) => item.id === focus.eventId);
  const node = graphNodes.find((item) => focus.graphNodeIds.includes(item.id));

  return (
    <section id="evidence-inspector" className="module-panel evidence-panel">
      <header className="module-header compact-header">
        <div>
          <p className="section-kicker">Evidence inspector</p>
          <h2>{event?.label ?? node?.label ?? 'Select evidence in the workbench'}</h2>
          <span>{event?.description ?? node?.description ?? 'Timeline events, graph nodes, and AI references resolve here.'}</span>
        </div>
        {focus.origin === 'assistant' && <span className="ai-focus-badge"><i /> AI focus</span>}
      </header>

      {records.length ? (
        <div className="evidence-grid">
          {records.map((record) => (
            <article key={record.id} className={`evidence-card ${record.evidenceType}`}>
              <div className="evidence-card-head">
                <span>{record.source}</span>
                <strong>{Math.round(record.confidence * 100)}% confidence</strong>
              </div>
              <h3>{record.title}</h3>
              <p>{record.summary}</p>
              <footer>
                <time>{formatTimestamp(record.timestamp)}</time>
              </footer>
            </article>
          ))}
        </div>
      ) : (
        <div className="evidence-empty">
          <div className="evidence-empty-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <div>
            <strong>No evidence selected</strong>
            <p>Select a timeline event, replay stage, graph node, or assistant reference.</p>
          </div>
        </div>
      )}
    </section>
  );
}
