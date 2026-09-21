import { useMemo, useState } from 'react';
import { incidents } from '../mockData';
import { useWorkbenchData } from '../WorkbenchDataContext';

const formatInr = (value: number) => `₹${(value / 100000).toFixed(value >= 1000000 ? 0 : 1)}L`;

const incidentOneLiner = (
  incident: (typeof incidents)[number],
  isLivePriority: boolean,
) => {
  if (isLivePriority) {
    return `Yield fell from ${incident.baselineYield}% to ${incident.currentYield}% during Batch ${incident.batchId}; final inspection rejected it.`;
  }
  return incident.summary.split(/(?<=[.!?])\s/)[0];
};

export function HomeDashboard({ onOpen }: { onOpen: () => void }) {
  const { data, loading } = useWorkbenchData();
  const incidentList = [data.incident, ...incidents.slice(1)];
  const [plant, setPlant] = useState('All plants');
  const [status, setStatus] = useState('All statuses');
  const filtered = useMemo(() => incidentList.filter((incident) => {
    const plantMatch = plant === 'All plants' || incident.plant === plant;
    const statusMatch = status === 'All statuses' || incident.status === status;
    return plantMatch && statusMatch;
  }), [data.incident, plant, status]);
  const yieldDelta = data.incident.baselineYield - data.incident.currentYield;
  const recentEvents = [...data.incidentEvents].slice(-4).reverse();

  return (
    <main className="dashboard-page">
      <section className="dashboard-hero">
        <div>
          <p className="section-kicker">Production overview</p>
          <h1>Good afternoon, Vaishak.</h1>
          <p>Four production signals need attention. One requires an evidence-backed decision.</p>
        </div>
        <div className="hero-actions">
          <button className="secondary-button" onClick={() => window.print()}>
            <span className="button-icon">↗</span>
            Export shift brief
          </button>
          <button className="primary-button" onClick={onOpen}>
            Open priority incident
            <span>→</span>
          </button>
        </div>
      </section>

      <section className="metric-grid" aria-label="Production KPIs">
        <article className="metric-card metric-critical">
          <div className="metric-topline"><span>Yield</span><span className="metric-delta negative">↓ {yieldDelta.toFixed(1)} pts</span></div>
          <strong>{data.incident.currentYield.toFixed(1)}<span>%</span></strong>
          <div className="mini-bars" aria-label="Yield trend">
            {[68, 72, 75, 70, 62, 49, 42, 36].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}
          </div>
          <small>Target {data.incident.baselineYield}% · {data.incident.line}</small>
        </article>
        <article className="metric-card">
          <div className="metric-topline"><span>Overall equipment effectiveness</span><span className="metric-delta positive">↑ 1.8%</span></div>
          <strong>88.4<span>%</span></strong>
          <div className="progress-track"><i style={{ width: '88.4%' }} /></div>
          <small>Plant target 90%</small>
        </article>
        <article className="metric-card">
          <div className="metric-topline"><span>Active incidents</span><span className="metric-delta neutral">4 open</span></div>
          <strong>04</strong>
          <div className="severity-counts">
            <span><i className="dot critical" />1 high</span>
            <span><i className="dot warning" />1 medium</span>
            <span><i className="dot info" />2 low</span>
          </div>
          <small>1 incident escalated</small>
        </article>
        <article className="metric-card">
          <div className="metric-topline"><span>Machine health</span><span className="metric-delta warning-text">M7 degraded</span></div>
          <strong>89<span>%</span></strong>
          <div className="machine-health-row">
            {[98, 94, 91, 89, 72].map((value, index) => (
              <i key={index} className={value < 80 ? 'warning' : ''} title={`Machine ${index + 3}: ${value}%`} />
            ))}
          </div>
          <small>Machine 7 health score 72%</small>
        </article>
      </section>

      <section className="dashboard-body">
        <div className="incident-section">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Decision queue</p>
              <h2>Active incidents</h2>
            </div>
            <div className="filter-row">
              <label>
                <span className="sr-only">Filter by plant</span>
                <select value={plant} onChange={(event) => setPlant(event.target.value)}>
                  <option>All plants</option>
                  <option>Plant Mumbai-1</option>
                  <option>Plant Pune-2</option>
                </select>
              </label>
              <label>
                <span className="sr-only">Filter by status</span>
                <select value={status} onChange={(event) => setStatus(event.target.value)}>
                  <option>All statuses</option>
                  <option value="open">Open</option>
                  <option value="investigating">Investigating</option>
                  <option value="monitoring">Monitoring</option>
                </select>
              </label>
            </div>
          </div>

          <div className="incident-list">
            {filtered.map((incident) => {
              const isPriority = incident.id === data.incident.id;
              const isDisplayOnly = incident.id === 'INC-2407-004';
              return (
              <article key={incident.id} className={`incident-row${isPriority ? ' priority' : ''}`}>
                <div className={`severity-rail ${incident.severity}`} />
                <div className="incident-main">
                  <div className="incident-title-row">
                    <div>
                      <span className={`severity-label ${incident.severity}`}>{incident.severity}</span>
                      <span className="incident-id">{incident.id}</span>
                    </div>
                    <span className={`status-label ${incident.status}`}>{incident.status}</span>
                  </div>
                  <h3>{incident.title}</h3>
                  <p className="incident-summary-line">
                    {incidentOneLiner(incident, isPriority)}
                  </p>
                  <div className="incident-meta">
                    <span>{incident.plant}</span>
                    <span>{incident.line}</span>
                    <span>Batch {incident.batchId}</span>
                    <span>{incident.product}</span>
                  </div>
                </div>
                <div className="incident-kpi">
                  <span>Current yield</span>
                  <strong>{incident.currentYield}%</strong>
                  <small>from {incident.baselineYield}%</small>
                </div>
                <div className="incident-exposure">
                  <span>Loss exposure</span>
                  <strong>{formatInr(incident.exposureInr)}</strong>
                  <small>per month</small>
                </div>
                <button
                  className={isDisplayOnly ? 'secondary-button compact incident-static-button' : isPriority ? 'primary-button compact' : 'secondary-button compact'}
                  onClick={isDisplayOnly ? undefined : onOpen}
                  disabled={isDisplayOnly}
                >
                  {isDisplayOnly ? 'Logged' : isPriority ? 'Open workbench' : 'Review'}
                  <span>→</span>
                </button>
              </article>
              );
            })}
            {filtered.length === 0 && <div className="empty-state">No incidents match these filters.</div>}
          </div>
        </div>

        <aside className="signal-panel">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Signal stream</p>
              <h2>Recent alerts</h2>
            </div>
            <span className="dataset-label">
              {loading ? 'Loading MCP' : data.live ? 'Live MCP records' : 'Fallback records'}
            </span>
          </div>
          <ol className="signal-list">
            {recentEvents.map((event) => (
              <li key={event.id}>
                <span className="signal-time">{new Date(event.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                <i className={`signal-icon ${event.category}`}>{event.source.slice(0, 2)}</i>
                <div><strong>{event.label}</strong><p>{event.value || event.description}</p></div>
                <span className={`signal-state ${event.severity}`}>{event.severity}</span>
              </li>
            ))}
          </ol>
        </aside>
      </section>
    </main>
  );
}
