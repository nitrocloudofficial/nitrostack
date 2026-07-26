const AGENT_LABEL = {
  product: 'Product',
  engineering: 'Engineering',
  security: 'Security',
  legal: 'Legal'
};

const STANCE_META = {
  agree: { label: 'Agrees & Resolves', className: 'stance-agree' },
  provides_fact: { label: 'Provides Fact / Mitigation', className: 'stance-agree' },
  partially_agree: { label: 'Partially Agrees', className: 'stance-partial' },
  disagree: { label: 'Disagrees / Escalates', className: 'stance-disagree' }
};

const COUNTERPART_MAP = {
  product: 'Engineering',
  engineering: 'Product',
  security: 'Legal',
  legal: 'Security'
};

export default function DebatePanel({ exchanges, agentOutputs, onNextStep, onBack }) {
  const findConcern = concernId => {
    for (const output of agentOutputs) {
      const concern = output?.concerns?.find(c => c.id === concernId || c.id?.toLowerCase().includes(concernId?.toLowerCase()));
      if (concern) return { concern, owner: output.agent };
    }
    return null;
  };

  return (
    <section className="stage-card debate-stage spacious-stage">
      <div className="stage-header">
        <span className="stage-badge">Stage 4 of 5</span>
        <h2>Structured Cross-Agent Debate</h2>
        <p className="stage-caption">
          Unlike static single-prompt AI tools, agents challenge each other's policy concerns up to 2 rounds.
          Unresolvable friction is escalated directly to the Executive Moderator.
        </p>
      </div>

      {exchanges.length === 0 ? (
        <div className="no-debate-box">
          <span>✨ All department agents reached immediate consensus with no active policy disputes!</span>
        </div>
      ) : (
        <div className="exchange-list spacious-exchanges">
          {exchanges.map((exchange, idx) => {
            const found = findConcern(exchange.responds_to);
            const stance = STANCE_META[exchange.stance] ?? { label: exchange.stance, className: '' };
            const targetAgentName = found ? AGENT_LABEL[found.owner] : (COUNTERPART_MAP[exchange.agent] || 'Cross-Dept');

            return (
              <div key={idx} className="exchange-item-card">
                <div className="exchange-header">
                  <div className="exchange-matchup">
                    <span className="agent-tag-badge">{AGENT_LABEL[exchange.agent] || exchange.agent}</span>
                    <span className="exchange-arrow">⚡ vs ⚡</span>
                    <span className="agent-tag-badge target">{targetAgentName}</span>
                    <span className="exchange-concern-id">[{exchange.responds_to}]</span>
                  </div>
                  <span className={`stance-pill ${stance.className}`}>{stance.label}</span>
                </div>

                {found && (
                  <div className="exchange-original-issue-box">
                    <span className="issue-label">Challenged Policy Concern:</span>
                    <p className="issue-quote">"{found.concern.issue}"</p>
                  </div>
                )}

                <div className="exchange-response-body">
                  <p className="exchange-response">{exchange.response}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="nav-action-bar">
        {onBack && (
          <button type="button" className="secondary-btn back-btn" onClick={onBack}>
            ← Back to Department Verdicts
          </button>
        )}
        {onNextStep && (
          <button type="button" className="run-button next-stage-btn" onClick={onNextStep}>
            Next: View Executive Verdict →
          </button>
        )}
      </div>
    </section>
  );
}
