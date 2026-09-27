import { useState } from 'react';
import { useFocusContext } from '../FocusContext';
import type { AssistantResponse } from '../types';
import { useWorkbenchData } from '../WorkbenchDataContext';
import { AssistantPanel } from './AssistantPanel';
import { EvidencePanel } from './EvidencePanel';
import { GraphPanel } from './GraphPanel';
import { RecommendationsPanel } from './RecommendationsPanel';
import { ReplayPanel } from './ReplayPanel';
import { SimulatorPanel } from './SimulatorPanel';
import { TimelinePanel } from './TimelinePanel';

export function Workbench({ onBack }: { onBack: () => void }) {
  const {
    focus,
    clearFocus,
    focusGraphNode,
    focusEvidenceRefs,
  } = useFocusContext();
  const { data, loading, refresh } = useWorkbenchData();
  const featuredIncident = data.incident;
  const [activeTab, setActiveTab] = useState<'investigate' | 'decide'>('investigate');
  const [agentResponse, setAgentResponse] = useState<AssistantResponse | null>(null);

  const scrollToPanel = (panelId: string) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.getElementById(panelId)?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      });
    });
  };

  const openComparison = () => {
    setActiveTab('decide');
    scrollToPanel('scenario-comparison');
  };

  const openEvidence = () => {
    scrollToPanel('evidence-inspector');
  };

  const applyAgentActions = (actions: AssistantResponse['uiActions']) => {
    for (const action of actions) {
      if (action.action === 'HIGHLIGHT_NODE' && action.targetId) {
        const nodeId = action.targetId.startsWith('node_')
          ? action.targetId
          : `node_${action.targetId}`;
        focusGraphNode(nodeId, 'assistant');
      }
    }
  };

  return (
    <main className="workbench-page">
      <nav className="workbench-breadcrumb" aria-label="Breadcrumb">
        <button onClick={onBack}>Incidents</button>
        <span>/</span>
        <span>{featuredIncident.id}</span>
        <span>/</span>
        <strong>Decision workbench</strong>
      </nav>

      <section className="incident-command-bar">
        <div className="incident-command-title">
          <span className="severity-label high">High severity</span>
          <div>
            <h1>{featuredIncident.title} · {featuredIncident.batchId}</h1>
            <p>{featuredIncident.plant} · {featuredIncident.line} · Yield <strong>{featuredIncident.baselineYield}% → {featuredIncident.currentYield}%</strong></p>
          </div>
        </div>
        <div className="command-status">
          <div>
            <span>Investigation state</span>
            <strong><i className="dot warning" /> Evidence review</strong>
          </div>
          <div>
            <span>Current focus</span>
            <strong>{focus.aiLabel ?? (focus.pinned ? 'Pinned replay moment' : focus.eventId ?? 'Batch overview')}</strong>
          </div>
          <button className="icon-button" onClick={clearFocus} title="Reset workbench focus" aria-label="Reset workbench focus">↺</button>
          <button className="icon-button" onClick={() => void refresh()} title="Refresh live MCP data" aria-label="Refresh live MCP data">↻</button>
        </div>
      </section>

      <div className="workbench-tabs" role="tablist" aria-label="Workbench mode">
        <div className="workbench-tab-switcher">
          <button className={activeTab === 'investigate' ? 'active' : ''} onClick={() => setActiveTab('investigate')}>01 · Investigate</button>
          <button className={activeTab === 'decide' ? 'active' : ''} onClick={() => setActiveTab('decide')}>02 · Decide</button>
        </div>
        <span className={`contract-badge${data.live ? ' live' : ''}`}>
          {loading ? 'Loading MCP data…' : data.live ? 'Live NitroCloud MCP data' : 'Degraded fallback data'}
        </span>
      </div>

      <div className="workbench-with-assistant">
        <div className="workbench-main">
          {activeTab === 'investigate' ? (
            <>
              <TimelinePanel />
              <div className="analysis-grid">
                <ReplayPanel />
                <GraphPanel />
              </div>
              <EvidencePanel />
            </>
          ) : (
            <>
              <SimulatorPanel />
              <RecommendationsPanel agentResponse={agentResponse} />
            </>
          )}
        </div>
        <div hidden={activeTab !== 'investigate'}>
          <AssistantPanel
            onOpenDecision={openComparison}
            onFocusEvidence={openEvidence}
            onAgentActions={applyAgentActions}
            onResponse={(response) => {
              setAgentResponse(response);
              focusEvidenceRefs(response.evidenceRefs, response.conclusion);
            }}
          />
        </div>
      </div>
    </main>
  );
}
