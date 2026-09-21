import React, { useState } from 'react';
import type { VerificationStep, SopDocument, WorkOrder } from '../types';
import { CheckCircle2, FileText, Code2, Layers, Zap, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';

interface AIInvestigationProps {
  activeScenarioTitle?: string;
  verificationSteps: VerificationStep[];
  sop?: SopDocument;
  workOrder?: WorkOrder;
  isInvestigating: boolean;
  onReRunInvestigation: () => void;
  onOpenWorkOrderTab: () => void;
}

export const AIInvestigation: React.FC<AIInvestigationProps> = ({
  activeScenarioTitle,
  verificationSteps,
  sop,
  workOrder,
  isInvestigating,
  onReRunInvestigation,
  onOpenWorkOrderTab,
}) => {
  const [selectedStepIndex, setSelectedStepIndex] = useState<number>(1);

  const selectedStep = verificationSteps.find((s) => s.stepIndex === selectedStepIndex) || verificationSteps[0];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '1.25rem', padding: '1.25rem' }}>
      
      {/* Left Column: NitroStack 3-Step Verification Chain Timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <span className="badge-nitro" style={{ marginBottom: '0.4rem' }}>
                <Zap size={12} /> NitroStack SDK Verification
              </span>
              <h2 style={{ fontSize: '1.1rem', marginTop: '0.2rem' }}>
                AI Diagnostic Verification Chain
              </h2>
              {activeScenarioTitle && (
                <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, marginTop: '0.2rem' }}>
                  {activeScenarioTitle}
                </div>
              )}
            </div>
            
            <button
              onClick={onReRunInvestigation}
              disabled={isInvestigating}
              className="btn-outline"
              style={{ padding: '0.35rem 0.7rem', fontSize: '0.75rem' }}
              title="Re-trigger verification chain"
            >
              <RefreshCw size={13} className={isInvestigating ? 'spin' : ''} />
              Re-Verify
            </button>
          </div>

          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: '1.4' }}>
            Multi-step verification chain executed by NitroStack agents prior to root cause commitment:
          </p>

          {/* Verification Steps Visual Stack */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {verificationSteps.map((step) => {
              const isSelected = step.stepIndex === selectedStepIndex;

              return (
                <div
                  key={step.stepIndex}
                  onClick={() => setSelectedStepIndex(step.stepIndex)}
                  className="verification-step done"
                  style={{
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(0, 242, 255, 0.08)' : 'rgba(255,255,255,0.02)',
                    padding: '0.8rem 1rem',
                    borderRadius: '8px',
                    border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'}`,
                    transition: 'all 0.2s ease',
                    marginBottom: '0.5rem'
                  }}
                >
                  <div className="verification-step-icon">
                    <CheckCircle2 size={13} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.82rem', color: isSelected ? 'var(--primary)' : 'var(--text-main)' }}>
                      {step.name.split(':')[0]}
                    </span>
                    <span className="code-font" style={{ fontSize: '0.65rem', color: 'var(--emerald)' }}>
                      VERIFIED
                    </span>
                  </div>

                  <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                    {step.name.split(':')[1] || step.description}
                  </p>

                  {step.mcpToolCall && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span className="code-font" style={{
                        fontSize: '0.65rem',
                        background: 'rgba(168, 85, 247, 0.15)',
                        color: '#c084fc',
                        padding: '0.15rem 0.4rem',
                        borderRadius: '4px',
                        border: '1px solid rgba(168, 85, 247, 0.3)'
                      }}>
                        @Tool {step.mcpToolCall.toolName}()
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Root Cause Verdict Card */}
        {workOrder && (
          <div className="glass-panel glass-panel-glow" style={{ padding: '1.25rem', background: 'rgba(0, 242, 255, 0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--emerald)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <ShieldCheck size={14} /> DIAGNOSIS VERIFIED
              </span>
              <span className="code-font" style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 800 }}>
                {(workOrder.confidenceScore * 100).toFixed(0)}% Confidence
              </span>
            </div>

            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '0.5rem', color: '#ffffff' }}>
              {workOrder.issueSummary}
            </h3>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: '1.4' }}>
              {workOrder.rootCause}
            </p>

            <button
              onClick={onOpenWorkOrderTab}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem' }}
            >
              View Generated Work Order ({workOrder.id}) <ArrowRight size={14} />
            </button>
          </div>
        )}

      </div>

      {/* Right Column: Deep Verification Step Details & MCP Tool Trace */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* Step Inspector & Findings Breakdown */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <span className="code-font" style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                Verification Chain Phase #{selectedStep.stepIndex}
              </span>
              <h2 style={{ fontSize: '1.1rem', marginTop: '0.1rem' }}>
                {selectedStep.name}
              </h2>
            </div>

            <span className="code-font" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Execution time: {selectedStep.timestamp}
            </span>
          </div>

          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: '1.5' }}>
            {selectedStep.description}
          </p>

          {/* Key Findings List */}
          <div style={{ marginBottom: '1.25rem' }}>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Layers size={15} color="var(--primary)" /> Step Findings & Triangulation Criteria:
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {selectedStep.findings.map((finding, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    padding: '0.6rem 0.8rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.78rem',
                    color: finding.includes('CRITICAL') || finding.includes('OUT OF STOCK') ? '#ff88a5' : 'var(--text-main)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <span style={{ color: 'var(--primary)', fontWeight: 700 }}>•</span>
                  <span>{finding}</span>
                </div>
              ))}
            </div>
          </div>

          {/* NitroStack MCP SDK Tool Execution Box */}
          {selectedStep.mcpToolCall && (
            <div>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Code2 size={15} color="var(--purple)" /> NitroStack MCP SDK `@Tool` Invocation:
              </h4>

              <div style={{ background: '#070a0f', borderRadius: '8px', border: '1px solid rgba(168, 85, 247, 0.3)', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.4rem' }}>
                  <span className="code-font" style={{ fontSize: '0.78rem', color: '#c084fc', fontWeight: 700 }}>
                    @Tool('{selectedStep.mcpToolCall.toolName}')
                  </span>
                  <span className="code-font" style={{ fontSize: '0.7rem', color: 'var(--emerald)' }}>
                    HTTP 200 OK (0.042s)
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <span className="code-font" style={{ fontSize: '0.68rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.3rem' }}>
                      // Input Arguments
                    </span>
                    <pre className="code-font" style={{ fontSize: '0.75rem', color: 'var(--text-main)', margin: 0, whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify(selectedStep.mcpToolCall.args, null, 2)}
                    </pre>
                  </div>

                  <div>
                    <span className="code-font" style={{ fontSize: '0.68rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.3rem' }}>
                      // SDK Tool Return Payload
                    </span>
                    <pre className="code-font" style={{ fontSize: '0.75rem', color: 'var(--emerald)', margin: 0, whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify(selectedStep.mcpToolCall.result, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Vector RAG SOP Context Display */}
        {sop && (
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={18} color="var(--primary)" />
                <div>
                  <h3 style={{ fontSize: '0.95rem' }}>{sop.title}</h3>
                  <span className="code-font" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Document ID: {sop.id} | Machine Type: {sop.machineType}
                  </span>
                </div>
              </div>

              <div className="status-pill healthy" style={{ background: 'rgba(0, 242, 255, 0.1)', color: 'var(--primary)', borderColor: 'rgba(0, 242, 255, 0.3)' }}>
                Vector Score: {(sop.relevanceScore * 100).toFixed(1)}%
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.9rem', borderRadius: '8px', borderLeft: '3px solid var(--primary)', fontSize: '0.8rem', lineHeight: '1.5', marginBottom: '0.8rem' }}>
              <strong style={{ color: 'var(--primary)', display: 'block', marginBottom: '0.2rem' }}>
                Retrieved Vector Chunk (Qdrant / FastEmbed RAG):
              </strong>
              {sop.contentSnippet}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.78rem' }}>
              <div>
                <strong style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>
                  Recommended Procedure:
                </strong>
                <span>{sop.recommendedAction}</span>
              </div>

              <div>
                <strong style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>
                  Required Replacement Components:
                </strong>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.2rem' }}>
                  {sop.requiredParts.map((p, i) => (
                    <span key={i} className="code-font" style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.06)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
