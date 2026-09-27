import { useRef, useState } from 'react';
import StepTracker from './components/StepTracker.jsx';
import ProposalForm from './components/ProposalForm.jsx';
import LiveAnalysisView from './components/LiveAnalysisView.jsx';
import AgentCard from './components/AgentCard.jsx';
import DebatePanel from './components/DebatePanel.jsx';
import FinalReport from './components/FinalReport.jsx';
import { startReview } from './api.js';

const EMPTY_AGENT_STATES = {
  product: { status: 'pending', output: null },
  engineering: { status: 'pending', output: null },
  security: { status: 'pending', output: null },
  legal: { status: 'pending', output: null }
};

export default function App() {
  const [currentStep, setCurrentStep] = useState(1); // 1..5
  const [maxUnlockedStep, setMaxUnlockedStep] = useState(1);
  const [agentStates, setAgentStates] = useState(EMPTY_AGENT_STATES);
  const [exchanges, setExchanges] = useState([]);
  const [finalReport, setFinalReport] = useState(null);
  const [fatalError, setFatalError] = useState(null);
  const [activeProposalTitle, setActiveProposalTitle] = useState('');
  const [isAnalysisComplete, setIsAnalysisComplete] = useState(false);
  const [eventLog, setEventLog] = useState([]);
  const cancelRef = useRef(null);

  const addLog = (type, details) => {
    const timeStr = new Date().toLocaleTimeString();
    setEventLog(prev => [...prev, { time: timeStr, type, details }]);
  };

  const handleRun = ({ proposalTitle, proposalDescription, useCached }) => {
    cancelRef.current?.();
    setAgentStates(EMPTY_AGENT_STATES);
    setExchanges([]);
    setFinalReport(null);
    setFatalError(null);
    setIsAnalysisComplete(false);
    setActiveProposalTitle(proposalTitle);
    setEventLog([]);

    // Transition immediately to Stage 2: Parallel Analysis
    setCurrentStep(2);
    setMaxUnlockedStep(2);
    addLog('review_start', `Review Board initiated for proposal "${proposalTitle}"`);

    cancelRef.current = startReview({
      proposalTitle,
      proposalDescription,
      useCached,
      onFatalError: () => {
        setFatalError(
          'Live connection to the review server was lost. If this happens during a demo, tick "Use cached run" and try again.'
        );
        addLog('error', 'Live connection to review server lost');
      },
      onEvent: (type, data) => {
        switch (type) {
          case 'agent_start':
            setAgentStates(prev => ({
              ...prev,
              [data.agent]: { ...prev[data.agent], status: 'thinking' }
            }));
            addLog('agent_start', `${data.agent.toUpperCase()} Agent analysis initiated`);
            break;

          case 'agent_done':
            setAgentStates(prev => ({
              ...prev,
              [data.agent]: { status: 'done', output: data.output }
            }));
            addLog('agent_done', `${data.agent.toUpperCase()} Agent review completed with verdict: ${data.output.verdict.toUpperCase()}`);
            break;

          case 'agent_error':
            setAgentStates(prev => ({
              ...prev,
              [data.agent]: { status: 'error', output: null }
            }));
            addLog('agent_error', `${data.agent.toUpperCase()} Agent review failed`);
            break;

          case 'reconciliation_done':
            setAgentStates(prev => ({
              ...prev,
              product: { status: 'done', output: data.productOutput }
            }));
            addLog('reconciliation', `Estimate reconciliation complete between Product and Engineering`);
            break;

          case 'debate_exchange':
            setExchanges(prev => [...prev, data.exchange]);
            addLog('debate_exchange', `${data.exchange.agent.toUpperCase()} responded to concern [${data.exchange.responds_to}] with stance: ${data.exchange.stance}`);
            break;

          case 'debate_done':
            setAgentStates(prev => {
              const next = { ...prev };
              data.outputs.forEach(output => {
                next[output.agent] = { status: 'done', output };
              });
              return next;
            });
            addLog('debate_done', `Cross-agent debate round finalized`);
            break;

          case 'final_report':
            setFinalReport(data.finalReport);
            setIsAnalysisComplete(true);
            setMaxUnlockedStep(5);
            addLog('final_report', `Executive Moderator synthesized report with final decision: ${data.finalReport.decision.toUpperCase()}`);
            break;

          case 'error':
            setFatalError(data.message || 'The review workflow failed.');
            addLog('error', data.message || 'Workflow failed');
            break;

          default:
            break;
        }
      }
    });
  };

  const handleRestart = () => {
    cancelRef.current?.();
    setAgentStates(EMPTY_AGENT_STATES);
    setExchanges([]);
    setFinalReport(null);
    setFatalError(null);
    setIsAnalysisComplete(false);
    setActiveProposalTitle('');
    setEventLog([]);
    setCurrentStep(1);
    setMaxUnlockedStep(1);
  };

  const agentOutputs = Object.values(agentStates)
    .map(s => s.output)
    .filter(Boolean);

  const isRunning = currentStep === 2 && !isAnalysisComplete;

  return (
    <div className="app-shell spacious-shell">
      <header className="hero">
        <div className="hero-badge">CFRB AI GOVERNANCE SYSTEM</div>
        <h1>Cross-Functional Decision Review Board</h1>
        <p className="hero-line">
          Automating cross-department governance. Multiple specialized AI agents — Product, Engineering, Security, and Legal —
          collaborate to evaluate proposals against enterprise policy docs before execution.
        </p>
      </header>

      <StepTracker
        currentStep={currentStep}
        maxUnlockedStep={maxUnlockedStep}
        onSelectStep={step => setCurrentStep(step)}
      />

      {fatalError && <div className="fatal-banner">⚠️ {fatalError}</div>}

      <main className="stage-content-area">
        {/* STAGE 1: PROPOSAL SUBMISSION */}
        {currentStep === 1 && (
          <ProposalForm onRun={handleRun} disabled={isRunning} />
        )}

        {/* STAGE 2: LIVE PARALLEL AGENT ANALYSIS */}
        {currentStep === 2 && (
          <LiveAnalysisView
            agentStates={agentStates}
            isComplete={isAnalysisComplete || maxUnlockedStep >= 3}
            onBack={() => setCurrentStep(1)}
            onNextStep={() => {
              setMaxUnlockedStep(prev => Math.max(prev, 3));
              setCurrentStep(3);
            }}
          />
        )}

        {/* STAGE 3: DEPARTMENT VERDICTS & FINDINGS */}
        {currentStep === 3 && (
          <section className="stage-card verdicts-stage spacious-stage">
            <div className="stage-header">
              <span className="stage-badge">Stage 3 of 5</span>
              <h2>Individual Department Findings &amp; Approval Status</h2>
              <p className="stage-caption">
                Reviewing specific policy violations, effort estimates, and initial verdicts for <strong>"{activeProposalTitle}"</strong>.
              </p>
            </div>

            <div className="agent-grid spacious-grid">
              {Object.entries(agentStates).map(([agent, state]) => (
                <AgentCard key={agent} agent={agent} state={state} />
              ))}
            </div>

            <div className="nav-action-bar">
              <button type="button" className="secondary-btn back-btn" onClick={() => setCurrentStep(2)}>
                ← Back to Live Analysis
              </button>
              <button
                type="button"
                className="run-button next-stage-btn"
                onClick={() => {
                  setMaxUnlockedStep(prev => Math.max(prev, 4));
                  setCurrentStep(4);
                }}
              >
                Next: Proceed to Multi-Agent Debate →
              </button>
            </div>
          </section>
        )}

        {/* STAGE 4: CROSS-AGENT DEBATE */}
        {currentStep === 4 && (
          <DebatePanel
            exchanges={exchanges}
            agentOutputs={agentOutputs}
            onBack={() => setCurrentStep(3)}
            onNextStep={() => {
              setMaxUnlockedStep(prev => Math.max(prev, 5));
              setCurrentStep(5);
            }}
          />
        )}

        {/* STAGE 5: EXECUTIVE MODERATOR VERDICT & AUDIT DOSSIER */}
        {currentStep === 5 && (
          <FinalReport
            report={finalReport}
            agentOutputs={agentOutputs}
            exchanges={exchanges}
            eventLog={eventLog}
            onBack={() => setCurrentStep(4)}
            onRestart={handleRestart}
          />
        )}
      </main>
    </div>
  );
}
