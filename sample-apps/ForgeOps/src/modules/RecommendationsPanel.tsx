import { useState } from 'react';
import { useFocusContext } from '../FocusContext';
import { approveDecision } from '../integrations/forgeOpsClient';
import type { AssistantResponse } from '../types';
import { useWorkbenchData } from '../WorkbenchDataContext';

const inr = (value: number) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
}).format(value);

export function RecommendationsPanel({
  agentResponse,
}: {
  agentResponse: AssistantResponse | null;
}) {
  const { focusEvidenceRefs } = useFocusContext();
  const { data } = useWorkbenchData();
  const { businessImpact, recommendations } = data;
  const [selectedId, setSelectedId] = useState(recommendations[0]?.id ?? '');
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [approvalId, setApprovalId] = useState<number | null>(null);
  const selected = recommendations.find((item) => item.id === selectedId) ?? recommendations[0];

  if (!selected) return null;

  const recordApproval = async () => {
    setApprovalStatus('loading');
    try {
      const record = await approveDecision(
        selected,
        agentResponse?.conclusion ?? 'No agent conclusion was attached.',
      );
      setApprovalId(record.id);
      setApprovalStatus('success');
      setApprovalOpen(false);
    } catch {
      setApprovalStatus('error');
    }
  };

  return (
    <>
      <section className="decision-grid">
        <div className="module-panel recommendations-panel">
          <header className="module-header">
            <div>
              <h2>Ranked recommendations</h2>
              <span>Technical effect, feasibility, cost, and business impact</span>
            </div>
            <span className="human-gate"><i /> Human approval required</span>
          </header>
          <div className="recommendation-list">
            {recommendations.map((recommendation) => (
              <article key={recommendation.id} className={`recommendation-card${selectedId === recommendation.id ? ' selected' : ''}`}>
                <button className="recommendation-select" onClick={() => setSelectedId(recommendation.id)}>
                  <span className="rank-number">0{recommendation.rank}</span>
                  <div>
                    <div className="recommendation-title">
                      <h3>{recommendation.title}</h3>
                      {recommendation.rank === 1 && <span>Recommended</span>}
                    </div>
                    <p>{recommendation.description}</p>
                    <div className="recommendation-tags">
                      <span>Yield {recommendation.predictedYield}%</span>
                      <span>{Math.round(recommendation.confidence * 100)}% confidence</span>
                      <span>Cost {recommendation.cost}</span>
                      <span>Risk {recommendation.risk}</span>
                    </div>
                  </div>
                  <strong className={`impact-score impact-${recommendation.impact.toLowerCase()}`}>{recommendation.impact}<small>impact</small></strong>
                </button>
                {selectedId === recommendation.id && (
                  <div className="recommendation-actions">
                    <button className="text-button" onClick={() => focusEvidenceRefs(recommendation.evidenceRefs)}>Open evidence ↗</button>
                    <span>{recommendation.effort}</span>
                    <button className="primary-button compact" onClick={() => setApprovalOpen(true)}>Review action <span>→</span></button>
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>

        <aside className="module-panel impact-panel">
          <header className="module-header compact-header">
            <div>
              <p className="section-kicker">Business impact</p>
              <h2>Decision value</h2>
              <span>Selected: {selected.title}</span>
            </div>
          </header>
          <div className="impact-hero">
            <span>Monthly loss avoided</span>
            <strong>{inr(businessImpact.monthlySavingsInr)}</strong>
            <small>from {inr(businessImpact.currentMonthlyLossInr)} exposure</small>
          </div>
          <div className="impact-metrics">
            <span><small>Yield recovery</small><strong>{businessImpact.baselineYield}% → {selected.predictedYield}%</strong></span>
            <span><small>Downtime reduction</small><strong>{selected.rank === 1 ? businessImpact.downtimeReductionPct : Math.round(businessImpact.downtimeReductionPct * 0.7)}%</strong></span>
            <span><small>Weekly savings</small><strong>{inr(selected.savingsPerWeekInr)}</strong></span>
            <span><small>Implementation</small><strong>{selected.effort}</strong></span>
          </div>
          {approvalStatus === 'success' && <div className="approval-record"><i>✓</i><div><strong>Decision recorded · #{approvalId}</strong><p>Persisted in the ForgeOps audit API. No plant control was changed.</p></div></div>}
          {approvalStatus === 'error' && <div className="approval-record"><div><strong>Approval was not recorded</strong><p>The backend audit API could not be reached.</p></div></div>}
        </aside>
      </section>

      {approvalOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setApprovalOpen(false); }}>
          <section className="approval-modal" role="dialog" aria-modal="true" aria-labelledby="approval-title">
            <header>
              <div><span className="human-gate"><i /> Approval gate</span><h2 id="approval-title">Confirm operational action</h2></div>
              <button className="icon-button" onClick={() => setApprovalOpen(false)} aria-label="Close approval dialog">×</button>
            </header>
            <div className="approval-summary">
              <span>Recommended action</span>
              <strong>{selected.title}</strong>
              <p>{selected.description}</p>
            </div>
            <dl>
              <div><dt>Recipient</dt><dd>Shift Manager · Assembly Line 3</dd></div>
              <div><dt>Affected system</dt><dd>MES dispatch schedule</dd></div>
              <div><dt>Requested change</dt><dd>Prioritize inter-stage transfer; queue target under 60 minutes</dd></div>
              <div><dt>Expected result</dt><dd>{selected.predictedYield}% yield · {Math.round(selected.confidence * 100)}% confidence</dd></div>
            </dl>
            <div className="approval-warning"><strong>Human authority</strong><p>ForgeOps recommends and explains. This confirmation records approval but does not directly modify plant controls.</p></div>
            <footer>
              <button className="secondary-button" onClick={() => setApprovalOpen(false)}>Cancel</button>
              <button className="primary-button" onClick={() => void recordApproval()} disabled={approvalStatus === 'loading'}>
                {approvalStatus === 'loading' ? 'Recording…' : 'Approve & record decision'} <span>→</span>
              </button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
