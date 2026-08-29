const AGENT_META = {
  product: { label: 'Product', icon: '📈', theme: 'agent-theme-product' },
  engineering: { label: 'Engineering', icon: '🛠️', theme: 'agent-theme-engineering' },
  security: { label: 'Security', icon: '🛡️', theme: 'agent-theme-security' },
  legal: { label: 'Legal', icon: '⚖️', theme: 'agent-theme-legal' }
};

const VERDICT_META = {
  approved: { label: 'Approved', className: 'verdict-approved' },
  flagged: { label: 'Flagged', className: 'verdict-flagged' },
  blocked: { label: 'Blocked', className: 'verdict-blocked' }
};

const SEVERITY_CLASS = {
  low: 'severity-low',
  medium: 'severity-medium',
  high: 'severity-high'
};

export default function AgentCard({ agent, state }) {
  const meta = AGENT_META[agent] || { label: agent, icon: '🤖', theme: '' };
  const status = state?.status ?? 'pending';
  const output = state?.output;

  return (
    <div className={`agent-card ${meta.theme} status-${status}`}>
      <div className="agent-card-header">
        <div className="agent-title-row">
          <span className="agent-icon">{meta.icon}</span>
          <span className="agent-name">{meta.label} Agent</span>
        </div>
        {status === 'thinking' && <span className="thinking-dot" aria-label="thinking" />}
        {output && (
          <span className={`verdict-badge ${VERDICT_META[output.verdict]?.className || 'verdict-flagged'}`}>
            {VERDICT_META[output.verdict]?.label || output.verdict}
          </span>
        )}
      </div>

      {status === 'pending' && <p className="agent-placeholder">Queued for parallel review...</p>}
      {status === 'thinking' && <p className="agent-placeholder thinking-text">Reviewing proposal against {meta.label.toLowerCase()} policy...</p>}
      {status === 'error' && <p className="agent-placeholder error-text">Review failed.</p>}

      {output && (
        <div className="agent-card-content">
          <p className="agent-summary">{output.summary}</p>

          {output.concerns.length === 0 ? (
            <div className="no-concerns">
              <span>✨ No policy violations or risk concerns raised.</span>
            </div>
          ) : (
            <div className="concerns-wrapper">
              <div className="concerns-header">Department Concerns &amp; Recommendations</div>
              <ul className="concern-list">
                {output.concerns.map(c => (
                  <li key={c.id} className="concern-item" id={`concern-${c.id}`}>
                    <div className="concern-top">
                      <span className={`severity-pill ${SEVERITY_CLASS[c.severity]}`}>{c.severity}</span>
                      <span className="concern-status-badge">{c.status}</span>
                    </div>
                    <p className="concern-issue">{c.issue}</p>
                    <p className="concern-recommendation">→ {c.recommendation}</p>
                    {c.tags && c.tags.length > 0 && (
                      <div className="tag-row">
                        {c.tags.map(t => (
                          <span key={t} className="tag-pill">#{t}</span>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {output.opportunity_cost_estimate && (
            <div className="extension-field">
              <span>Effort Estimate:</span>
              <strong>{output.opportunity_cost_estimate.effort.toUpperCase()}</strong>
              <em>
                ({output.opportunity_cost_estimate.effort_source === 'reconciled_with_engineering'
                  ? 'reconciled with Engineering'
                  : 'provisional'})
              </em>
            </div>
          )}
          {output.effort_assessment && (
            <div className="extension-field">
              <span>Effort Size:</span>
              <strong>{output.effort_assessment.size.toUpperCase()}</strong>
              <em>({output.effort_assessment.basis.replaceAll('_', ' ')})</em>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
