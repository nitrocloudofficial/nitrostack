export default function BoardHealthHeader({ report, agentOutputs = [], exchanges = [] }) {
  const alignment = report?.agent_alignment || {};
  const alignmentEntries = Object.entries(alignment);
  const totalDepts = alignmentEntries.length || 4;

  const approvedDepts = alignmentEntries.filter(([, v]) => v === 'approved').length;
  const flaggedDepts = alignmentEntries.filter(([, v]) => v === 'flagged').length;
  const blockedDepts = alignmentEntries.filter(([, v]) => v === 'blocked').length;

  // Aggregate concerns from agentOutputs
  let allConcerns = [];
  if (agentOutputs && agentOutputs.length > 0) {
    agentOutputs.forEach(o => {
      if (o?.concerns && Array.isArray(o.concerns)) {
        allConcerns.push(...o.concerns);
      }
    });
  }

  const totalConcerns = allConcerns.length;
  const resolvedCount = allConcerns.filter(c => c.status === 'resolved').length;
  const unresolvedCount = totalConcerns - resolvedCount;

  const highUnresolved = allConcerns.filter(c => c.severity === 'high' && c.status !== 'resolved').length;
  const medUnresolved = allConcerns.filter(c => c.severity === 'medium' && c.status !== 'resolved').length;

  // Compute dynamic Board Consensus Percentage
  let consensusPercent = 100;
  if (totalDepts > 0) {
    const deptScore = (approvedDepts / totalDepts) * 70 + (flaggedDepts / totalDepts) * 35;
    const concernScore = totalConcerns > 0 ? (resolvedCount / totalConcerns) * 30 : 30;
    consensusPercent = Math.round(deptScore + concernScore);
  }

  if (report?.decision === 'blocked') {
    consensusPercent = Math.min(consensusPercent, 45);
  } else if (report?.decision === 'approved_with_conditions') {
    consensusPercent = Math.min(Math.max(consensusPercent, 65), 88);
  }

  // Compute dynamic Risk Score (0 - 100)
  let rawRisk = (highUnresolved * 25) + (medUnresolved * 12) + (blockedDepts * 20) + (flaggedDepts * 10);
  if (totalConcerns > 0 && unresolvedCount === 0) {
    rawRisk = 12; // Low baseline risk when all concerns are resolved
  }
  if (report?.decision === 'blocked') {
    rawRisk = Math.max(rawRisk, 75);
  } else if (report?.decision === 'approved_with_conditions') {
    rawRisk = Math.min(Math.max(rawRisk, 32), 65);
  } else if (report?.decision === 'approved') {
    rawRisk = Math.min(rawRisk, 20);
  }
  const overallRiskScore = Math.min(Math.max(rawRisk, totalConcerns === 0 ? 5 : 10), 98);

  // Status color class for Risk Score
  const riskColorClass = overallRiskScore >= 70 ? 'risk-high' : overallRiskScore >= 35 ? 'risk-medium' : 'risk-low';

  return (
    <div className="board-health-dashboard">
      <div className="health-dashboard-title">
        <span className="health-badge">LIVE GOVERNANCE METRICS</span>
        <h3>Board Health &amp; Governance Summary</h3>
      </div>

      <div className="health-metrics-grid">
        {/* Consensus Meter */}
        <div className="health-card card-consensus">
          <div className="health-card-label">Board Consensus</div>
          <div className="consensus-value-row">
            <div className="consensus-bar-track">
              <div
                className="consensus-bar-fill"
                style={{
                  width: `${consensusPercent}%`,
                  background: consensusPercent < 60 ? '#ef4444' : consensusPercent < 85 ? '#f59e0b' : '#10b981'
                }}
              />
            </div>
            <span className="consensus-percent-text">{consensusPercent}%</span>
          </div>
        </div>

        {/* Overall Risk Score */}
        <div className="health-card card-risk">
          <div className="health-card-label">Overall Risk Score</div>
          <div className={`risk-score-value ${riskColorClass}`}>
            <span className="score-num">{overallRiskScore}</span>
            <span className="score-max">/100</span>
          </div>
        </div>

        {/* Departments Status */}
        <div className="health-card card-depts">
          <div className="health-card-label">Departments Status</div>
          <div className="dept-status-value">
            <span className="stat-highlight">{approvedDepts} / {totalDepts} Approved</span>
            <span className="stat-sub">
              {blockedDepts > 0
                ? `${blockedDepts} Blocked`
                : flaggedDepts > 0
                ? `${flaggedDepts} Flagged`
                : '0 Flagged/Blocked'}
            </span>
          </div>
        </div>

        {/* Concerns Overview */}
        <div className="health-card card-concerns">
          <div className="health-card-label">Concerns Overview</div>
          <div className="concerns-stat-pills">
            <div className="concern-stat-item">
              <span className="stat-num">{totalConcerns}</span>
              <span className="stat-tag">Total</span>
            </div>
            <div className="concern-stat-item resolved">
              <span className="stat-num">{resolvedCount}</span>
              <span className="stat-tag">Resolved</span>
            </div>
            <div className="concern-stat-item unresolved">
              <span className="stat-num">{unresolvedCount}</span>
              <span className="stat-tag">Unresolved</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
