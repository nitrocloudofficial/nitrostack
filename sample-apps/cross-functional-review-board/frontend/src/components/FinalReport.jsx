import { useState } from 'react';
import BoardHealthHeader from './BoardHealthHeader.jsx';

const DECISION_META = {
  approved: { label: '🟢 PROPOSAL APPROVED', className: 'decision-approved', icon: '✅' },
  approved_with_conditions: { label: '🟡 APPROVED WITH CONDITIONS', className: 'decision-conditions', icon: '⚠️' },
  blocked: { label: '🔴 PROPOSAL BLOCKED', className: 'decision-blocked', icon: '⛔' }
};

const AGENT_LABEL = {
  product: 'Product',
  engineering: 'Engineering',
  security: 'Security',
  legal: 'Legal'
};

export default function FinalReport({ report, agentOutputs = [], exchanges = [], eventLog = [], onRestart, onBack }) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('summary'); // summary | improvement | log

  if (!report) return null;
  const meta = DECISION_META[report.decision] || DECISION_META.blocked;

  const handleCopyReport = () => {
    const text = `CFRB EXECUTIVE DECISION REPORT
Decision: ${meta.label}
Basis: ${report.decision_basis}
Summary: ${report.overall_summary}
Required Actions:
${report.required_actions?.map(a => `- [${AGENT_LABEL[a.owner_agent]}] ${a.action}`).join('\n') || 'None'}
`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <section className="stage-card final-report-stage spacious-stage">
      {/* Board Health Summary Dashboard at the top */}
      <BoardHealthHeader report={report} agentOutputs={agentOutputs} exchanges={exchanges} />

      <div className="stage-header">
        <span className="stage-badge">Stage 5 of 5</span>
        <h2>Executive Moderator Verdict &amp; Governance Audit Dossier</h2>
        <p className="stage-caption">
          Synthesis of all departmental findings, debate outcomes, internal policy compliance, and required deployment actions.
        </p>
      </div>

      <div className={`decision-reveal-hero ${meta.className}`}>
        <div className="decision-icon-large">{meta.icon}</div>
        <div className="decision-text-group">
          <div className="decision-title-text">{meta.label}</div>
          <div className="decision-basis-badge">{report.decision_basis}</div>
        </div>
      </div>

      {/* Dossier Tabs */}
      <div className="dossier-tab-bar">
        <button
          type="button"
          className={`dossier-tab ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          📄 Executive Summary &amp; Actions
        </button>
        <button
          type="button"
          className={`dossier-tab ${activeTab === 'improvement' ? 'active' : ''}`}
          onClick={() => setActiveTab('improvement')}
        >
          💡 Proposal Improvement Roadmap
        </button>
        <button
          type="button"
          className={`dossier-tab ${activeTab === 'log' ? 'active' : ''}`}
          onClick={() => setActiveTab('log')}
        >
          🖥️ Execution Audit Event Log ({eventLog.length})
        </button>
      </div>

      {/* TAB 1: EXECUTIVE SUMMARY */}
      {activeTab === 'summary' && (
        <div className="tab-content-pane">
          <div className="report-summary-box">
            <h3>Executive Reason &amp; Summary</h3>
            <p className="overall-summary">{report.overall_summary}</p>
          </div>

          <div className="alignment-section">
            <h3>Final Departmental Alignment</h3>
            <div className="alignment-grid">
              {Object.entries(report.agent_alignment || {}).map(([agent, verdict]) => (
                <div key={agent} className={`alignment-card verdict-${verdict}`}>
                  <span className="agent-align-name">{AGENT_LABEL[agent] || agent}</span>
                  <span className="agent-align-verdict">{verdict.toUpperCase()}</span>
                </div>
              ))}
            </div>
          </div>

          {report.required_actions && report.required_actions.length > 0 && (
            <div className="report-block actions-block">
              <h3>Mandatory Required Actions Before Deployment</h3>
              <ul className="report-list required-actions-checklist">
                {report.required_actions.map((a, i) => (
                  <li key={i} className="action-item checklist-item">
                    <span className="check-bullet">✓</span>
                    <span className="action-owner-badge">{AGENT_LABEL[a.owner_agent] || a.owner_agent}</span>
                    <span className="action-desc-text">{a.action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {report.unresolved_risks && report.unresolved_risks.length > 0 && (
            <div className="report-block risks-block">
              <h3>Unresolved Risks / Escalated Items</h3>
              <ul className="report-list">
                {report.unresolved_risks.map(r => (
                  <li key={r.concern_id} className="risk-item">
                    <span className="risk-tag">{AGENT_LABEL[r.agent] || r.agent}</span>
                    <span className="risk-id">[{r.concern_id}]</span>
                    <span className="risk-reason">{r.why_unresolved}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PROPOSAL IMPROVEMENT ROADMAP */}
      {activeTab === 'improvement' && (
        <div className="tab-content-pane improvement-roadmap-pane">
          <h3>How to Improve &amp; Re-submit Proposal for Full Sign-off</h3>
          <p className="roadmap-intro">
            To address the board's policy concerns and achieve un-conditioned approval, incorporate the following recommendations:
          </p>

          <div className="roadmap-grid">
            <div className="roadmap-card card-security-guide">
              <h4>🛡️ Security &amp; Data Privacy Mitigations</h4>
              <ul>
                <li>Conduct a formal <strong>Privacy Impact Assessment (PIA)</strong> prior to rollout.</li>
                <li>Define explicit <strong>data retention schedules</strong> (e.g. 12-month max retention for behavioral analytics).</li>
                <li>Ensure <strong>encryption in transit &amp; at rest</strong> with TLS 1.3 and AES-256 for event pipelines.</li>
                <li>Implement explicit in-app <strong>customer opt-out toggles</strong> for account administrators.</li>
              </ul>
            </div>

            <div className="roadmap-card card-engineering-guide">
              <h4>🛠️ Engineering &amp; Architecture Mitigations</h4>
              <ul>
                <li>Define explicit <strong>data verification &amp; migration rollback procedures</strong> for zero-downtime cutover.</li>
                <li>Obtain <strong>SOC 2 Type II reports</strong> and third-party penetration testing results for cloud vendors.</li>
                <li>Establish regional latency targets (e.g. &lt;50ms) with automated SLA monitoring.</li>
              </ul>
            </div>

            <div className="roadmap-card card-legal-guide">
              <h4>⚖️ Legal &amp; Compliance Mitigations</h4>
              <ul>
                <li>Execute a standard <strong>Data Processing Agreement (DPA)</strong> including Standard Contractual Clauses (SCCs).</li>
                <li>Update public privacy disclosures to explicitly outline behavioral personalization processing.</li>
                <li>Ensure compliance with GDPR &amp; CCPA/CPRA data subject access and deletion rights.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: EXECUTION AUDIT EVENT LOG */}
      {activeTab === 'log' && (
        <div className="tab-content-pane audit-log-pane">
          <h3>Real-time Execution Audit Log</h3>
          <p className="audit-sub">Complete audit trail of SSE milestones received during board execution:</p>
          
          <div className="audit-log-terminal">
            {eventLog.length === 0 ? (
              <div className="log-empty">No events captured in log.</div>
            ) : (
              eventLog.map((log, idx) => (
                <div key={idx} className={`log-line log-type-${log.type}`}>
                  <span className="log-timestamp">[{log.time}]</span>
                  <span className="log-event-type">{log.type.toUpperCase()}</span>
                  <span className="log-details">{log.details}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div className="nav-action-bar dossier-action-bar">
        {onBack && (
          <button type="button" className="secondary-btn back-btn" onClick={onBack}>
            ← Back to Debate
          </button>
        )}
        <div className="nav-action-right">
          <button type="button" className="secondary-btn" onClick={handleCopyReport}>
            {copied ? '✓ Executive Brief Copied!' : '📋 Copy Executive Brief'}
          </button>
          {onRestart && (
            <button type="button" className="run-button primary-btn" onClick={onRestart}>
              🔄 Start New Board Review
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
