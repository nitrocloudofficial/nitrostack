const AGENTS = [
  { key: 'product', label: 'Product', icon: '📈', colorClass: 'agent-theme-product', policy: 'Product Strategy & ROI' },
  { key: 'engineering', label: 'Engineering', icon: '🛠️', colorClass: 'agent-theme-engineering', policy: 'Architecture & Scalability' },
  { key: 'security', label: 'Security', icon: '🛡️', colorClass: 'agent-theme-security', policy: 'Data Protection & Encryption' },
  { key: 'legal', label: 'Legal', icon: '⚖️', colorClass: 'agent-theme-legal', policy: 'GDPR / CCPA & Compliance' }
];

export default function LiveAnalysisView({ agentStates, isComplete, onNextStep, onBack }) {
  const completedCount = Object.values(agentStates).filter(s => s.status === 'done').length;
  const progressPercent = Math.round((completedCount / 4) * 100);

  return (
    <section className="stage-card live-analysis-stage spacious-stage">
      <div className="stage-header">
        <span className="stage-badge">Stage 2 of 5</span>
        <h2>Agents Reviewing in Parallel</h2>
        <p className="stage-caption">
          Each specialized department agent operates independently in an isolated sandbox to prevent groupthink.
        </p>
      </div>

      <div className="progress-container spacious-progress">
        <div className="progress-bar-header">
          <span>Parallel Evaluation Progress</span>
          <span className="progress-value">{progressPercent}%</span>
        </div>
        <div className="progress-bar-track">
          <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <div className="live-agent-grid spacious-grid">
        {AGENTS.map(({ key, label, icon, colorClass, policy }) => {
          const state = agentStates[key] || { status: 'pending', output: null };
          const { status, output } = state;

          return (
            <div key={key} className={`live-agent-card ${colorClass} status-${status}`}>
              <div className="live-card-header">
                <div className="agent-avatar">
                  <span className="agent-icon-emoji">{icon}</span>
                </div>
                <div className="agent-title-block">
                  <div className="agent-name-text">{label} Agent</div>
                  <div className="agent-sub-policy">{policy}</div>
                </div>
                <div className="status-indicator-badge">
                  {status === 'pending' && <span className="status-pill pill-pending">Queued</span>}
                  {status === 'thinking' && (
                    <span className="status-pill pill-thinking">
                      <span className="pulse-dot" /> Analyzing...
                    </span>
                  )}
                  {status === 'done' && <span className="status-pill pill-done">Completed ✓</span>}
                  {status === 'error' && <span className="status-pill pill-error">Failed ❌</span>}
                </div>
              </div>

              <div className="live-card-body">
                {status === 'pending' && (
                  <div className="status-log-placeholder">
                    Waiting to initialize parallel review thread...
                  </div>
                )}
                {status === 'thinking' && (
                  <div className="status-log-active">
                    <div className="scanner-line" />
                    <span>Cross-referencing proposal against {label.toLowerCase()} policies...</span>
                  </div>
                )}
                {status === 'done' && output && (
                  <div className="status-done-summary">
                    <div className="verdict-tag-row">
                      <span className={`verdict-mini-tag verdict-${output.verdict}`}>
                        {output.verdict.toUpperCase()}
                      </span>
                      <span className="concerns-count">
                        {output.concerns.length} concern{output.concerns.length === 1 ? '' : 's'} identified
                      </span>
                    </div>
                    <p className="summary-preview">{output.summary}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="nav-action-bar">
        {onBack && (
          <button type="button" className="secondary-btn back-btn" onClick={onBack}>
            ← Back to Proposal
          </button>
        )}
        <div className="nav-action-right">
          {isComplete ? (
            <button type="button" className="run-button next-stage-btn" onClick={onNextStep}>
              Next: View Department Verdicts →
            </button>
          ) : (
            <div className="stage-waiting-banner inline-banner">
              <span className="live-spinner" />
              <span>Executing parallel agent analysis...</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
