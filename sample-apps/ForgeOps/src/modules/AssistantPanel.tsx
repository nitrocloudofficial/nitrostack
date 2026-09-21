import { FormEvent, useEffect, useState } from 'react';
import { useFocusContext } from '../FocusContext';
import {
  askAgent,
  getRuntimeStatus,
  type RuntimeStatus,
} from '../integrations/forgeOpsClient';
import type { AssistantResponse, LoadState } from '../types';
import { useWorkbenchData } from '../WorkbenchDataContext';

const prompts = [
  {
    key: 'evidence',
    label: 'Show me the evidence',
    query: 'Show me the evidence and identify the strongest controllable cause.',
  },
  {
    key: 'machine',
    label: 'Why not Machine 7?',
    query: 'Why was Machine 7 ruled out as the primary action?',
  },
  {
    key: 'compare',
    label: 'Compare the options',
    query: 'Compare reducing queue delay, humidity control, and replacing Machine 7.',
  },
  {
    key: 'report',
    label: 'Generate manager report',
    query: 'Generate a report for the plant manager.',
  },
  {
    key: 'sequence',
    label: 'Trace the anomaly sequence',
    query: 'Trace the anomaly sequence from intake through final inspection.',
  },
  {
    key: 'controllable',
    label: 'Find the most controllable cause',
    query: 'Which root cause is most controllable, and what evidence supports it?',
  },
  {
    key: 'risk',
    label: 'Assess production risk',
    query: 'What happens if queue delay remains above 120 minutes?',
  },
  {
    key: 'next-shift',
    label: 'Plan the next shift',
    query: 'Recommend a safe action plan for the next production shift.',
  },
];

type AssistantPanelProps = {
  onOpenDecision: () => void;
  onFocusEvidence: () => void;
  onAgentActions: (actions: AssistantResponse['uiActions']) => void;
  onResponse: (response: AssistantResponse) => void;
};

export function AssistantPanel({
  onOpenDecision,
  onFocusEvidence,
  onAgentActions,
  onResponse,
}: AssistantPanelProps) {
  const { focus, focusEvidenceRefs } = useFocusContext();
  const { applyAgentData } = useWorkbenchData();
  const [status, setStatus] = useState<LoadState>('idle');
  const [response, setResponse] = useState<AssistantResponse | null>(null);
  const [question, setQuestion] = useState('');
  const [draft, setDraft] = useState('');
  const [traceOpen, setTraceOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [runtime, setRuntime] = useState<RuntimeStatus | null>(null);

  useEffect(() => {
    let active = true;
    getRuntimeStatus().then((result) => {
      if (active) setRuntime(result);
    });
    return () => {
      active = false;
    };
  }, []);

  const runQuery = async (rawQuery: string) => {
    const query = rawQuery.trim();
    if (!query || status === 'loading') return;
    setQuestion(query);
    setDraft('');
    setStatus('loading');
    const result = await askAgent(query);
    setResponse(result);
    setStatus('success');
    applyAgentData(result.workbenchData);
    onResponse(result);
    onAgentActions(result.uiActions);
    if (
      result.generatedReports.length > 0
      || result.uiActions.some((action) => action.action === 'OPEN_REPORT_PANEL')
    ) {
      setReportOpen(true);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void runQuery(draft);
  };

  const liveReady = Boolean(
    runtime?.online
    && runtime.llmBacked
    && runtime.mcpServerAttached
    && runtime.agentRoles === 4,
  );
  const report = response?.generatedReports[0];

  return (
    <>
      <aside className="assistant-panel">
        <header className="assistant-header">
          <div className="assistant-identity">
            <span className="assistant-orb" aria-hidden="true"><i /><i /></span>
            <div>
              <strong>Decision assistant</strong>
              <small className={liveReady ? 'online' : runtime ? 'offline' : 'checking'}>
                <i /> {liveReady ? 'Live agents and MCP online' : runtime ? 'Degraded mode' : 'Checking agents'}
              </small>
            </div>
          </div>
          <span className="assistant-mode-label">
            {runtime?.online
              ? `${runtime.agentRoles} agent roles · ${runtime.orchestratorProcesses} orchestrator · ${runtime.toolCount} MCP tools`
              : 'Offline fallback'}
          </span>
        </header>

        <div className="assistant-context-strip">
          <span>Context</span>
          <strong>{focus.pinned ? `Pinned at +${focus.timeMinute} min` : focus.eventId ?? 'Incident overview'}</strong>
          <small>{focus.graphNodeIds.length} graph nodes · {focus.evidenceIds.length} evidence refs</small>
        </div>

        {(question || status === 'loading' || (response && status === 'success')) && (
          <div className="assistant-conversation" aria-live="polite">
          {question && (
            <div className="assistant-user-question">
              <span>You</span>
              <p>{question}</p>
            </div>
          )}

          {status === 'loading' && (
            <div className="assistant-thinking">
              <span className="assistant-orb small"><i /><i /></span>
              <div>
                <strong>Running the four-agent investigation</strong>
                <p>Planning, retrieving MCP records, analyzing scenarios, and preparing the decision…</p>
                <span><i /><i /><i /></span>
              </div>
            </div>
          )}

          {response && status === 'success' && (
            <div className="assistant-answer">
              <span className="assistant-orb small"><i /><i /></span>
              <div>
                <span className="answer-label">Conclusion</span>
                <h3>{response.conclusion}</h3>
                <p>{response.effect}</p>
                <div className="answer-confidence">
                  <span><i style={{ width: `${response.confidence * 100}%` }} /></span>
                  <strong>{Math.round(response.confidence * 100)}% confidence</strong>
                </div>
                <p className="output-footnote">
                  {response.pipelineMode === 'live_nitrocloud'
                    ? `Live NitroCloud reasoning · ${response.model}`
                    : response.pipelineMode === 'live_nitrocloud_with_safe_tool_selection'
                      ? 'Live NitroCloud reasoning and MCP evidence · safe research tool selection used'
                      : 'Degraded fallback mode · verify before acting'}
                </p>
                <div className="assistant-evidence-links">
                  {response.evidenceRefs.map((ref) => (
                    <button
                      key={ref}
                      onClick={() => focusEvidenceRefs([ref], response.conclusion)}
                    >
                      {ref} ↗
                    </button>
                  ))}
                </div>
                <details className="assumption-details">
                  <summary>Assumptions ({response.assumptions.length})</summary>
                  <ul>{response.assumptions.map((item) => <li key={item}>{item}</li>)}</ul>
                </details>
              </div>
            </div>
          )}
          </div>
        )}

        <form className="assistant-composer" onSubmit={submit}>
          <label htmlFor="agent-question">Ask the agents</label>
          <div>
            <textarea
              id="agent-question"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="Ask about causes, evidence, constraints, scenarios, or next actions…"
              rows={3}
            />
            <button
              className="primary-button"
              type="submit"
              disabled={!draft.trim() || status === 'loading'}
            >
              {status === 'loading' ? 'Running…' : 'Send'}
            </button>
          </div>
          <small>Enter to send · Shift+Enter for a new line</small>
        </form>

        <div className="assistant-prompts">
          <span>Suggested investigations</span>
          {prompts.map((prompt) => (
            <button
              key={prompt.key}
              onClick={() => void runQuery(prompt.query)}
              disabled={status === 'loading'}
            >
              {prompt.label}<span>→</span>
            </button>
          ))}
        </div>

        {response && (
          <div className="assistant-actions">
            {response.actions.includes('open_evidence') && (
              <button
                className="secondary-button compact"
                onClick={() => {
                  focusEvidenceRefs(response.evidenceRefs, response.conclusion);
                  onFocusEvidence();
                }}
              >
                Focus evidence
              </button>
            )}
            {response.actions.includes('run_comparison') && (
              <button className="secondary-button compact" onClick={onOpenDecision}>
                Open comparison
              </button>
            )}
            {response.actions.includes('generate_report') && (
              <button className="primary-button compact" onClick={() => setReportOpen(true)}>
                Open decision brief
              </button>
            )}
          </div>
        )}

        <div className="tool-trace">
          {response?.agentTrace && response.agentTrace.length > 0 && (
            <div className="assistant-context-strip">
              <span>Agent run</span>
              <strong>{response.agentTrace.map((step) => step.agent).join(' → ')}</strong>
              <small>
                {response.agentTrace.map((step) => (
                  `${step.agent}: ${
                    step.status === 'complete_with_safe_tool_selection'
                      ? 'live MCP · safe tool selection'
                      : step.status
                  }${step.attempts && step.attempts > 1 ? ` (${step.attempts} attempts)` : ''}`
                )).join(' · ')}
              </small>
              {response.agentTrace.some((step) => step.error) && (
                <ul className="agent-run-errors">
                  {response.agentTrace
                    .filter((step) => step.error)
                    .map((step) => (
                      <li key={step.agent}>
                        <strong>{step.agent}</strong>: {step.error}
                      </li>
                    ))}
                </ul>
              )}
            </div>
          )}
          <button onClick={() => setTraceOpen((value) => !value)} aria-expanded={traceOpen}>
            <span><i /> Live MCP tool trace</span>
            <strong>{response?.toolTrace.length ?? 0} calls {traceOpen ? '⌃' : '⌄'}</strong>
          </button>
          {traceOpen && (
            <ol>
              {(response?.toolTrace ?? []).map((step, index) => (
                <li key={`${step.id}-${index}`}>
                  <i />
                  <div>
                    <span>{step.server}</span>
                    <strong>{step.tool}</strong>
                    <small>{step.records.join(', ') || step.status}</small>
                  </div>
                  <time>{step.durationMs} ms</time>
                </li>
              ))}
              {!response && <li className="trace-empty">Run an investigation to populate the audit trail.</li>}
            </ol>
          )}
        </div>
      </aside>

      {reportOpen && response && (
        <div
          className="modal-backdrop report-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setReportOpen(false);
          }}
        >
          <article className="report-modal" role="dialog" aria-modal="true" aria-labelledby="report-title">
            <header>
              <div>
                <p className="section-kicker">Plant manager brief · Draft</p>
                <h2 id="report-title">Agent decision brief</h2>
              </div>
              <button className="icon-button" onClick={() => setReportOpen(false)} aria-label="Close report preview">×</button>
            </header>
            {report?.markdown ? (
              <pre className="agent-report-markdown">{report.markdown}</pre>
            ) : (
              <>
                <div className="report-summary">
                  <span>Decision required</span>
                  <h3>{response.conclusion}</h3>
                  <p>{response.effect}</p>
                </div>
                <div className="report-columns">
                  <section><span>Evidence</span><p>{response.evidenceRefs.join(' · ')}</p></section>
                  <section><span>Confidence</span><p>{Math.round(response.confidence * 100)}% based on live MCP evidence and scenario analysis.</p></section>
                </div>
              </>
            )}
            <div className="report-guardrail">
              <strong>Approval status</strong>
              <p>Draft only. An authorized manager must approve before any operational action or notification.</p>
            </div>
            <footer>
              <button className="secondary-button" onClick={() => window.print()}>Print / save PDF</button>
              <button className="primary-button" onClick={() => setReportOpen(false)}>Return to workbench</button>
            </footer>
          </article>
        </div>
      )}
    </>
  );
}
