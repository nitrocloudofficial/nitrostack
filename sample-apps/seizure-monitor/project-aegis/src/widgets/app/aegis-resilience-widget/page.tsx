'use client';
// ============================================================================
// Project Aegis — Interactive NitroStack Dashboard Widget
// Renders the Aegis Resilience Widget registered via @Widget('aegis-resilience-widget').
// Uses NitroStack WidgetSDK for tool invocation and state management.
//
// SDK API:
//   useWidgetSDK()  — React hook for the WidgetSDK instance
//   sdk.callTool()  — invoke an MCP tool from the widget
//   sdk.getToolOutput() — get the data that triggered this widget render
//   sdk.getTheme()  — dark/light mode detection
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useWidgetSDK, useTheme, type WidgetSDK } from '@nitrostack/widgets';
import './aegis-dashboard.css';

// ──────────────────────────────────────────────────────────────────────────────
// Type Definitions (mirroring server types for widget-side use)
// ──────────────────────────────────────────────────────────────────────────────

interface SubspaceAnalysisData {
  residualNorm: number;
  isAnomaly: boolean;
  threshold: number;
  baselineDimensions: number;
  capturedEnergy: number;
  timestamp: string;
}

interface ClassificationResult {
  signature: string;
  recommendedPattern: string | null;
  justification: string;
  inputVector: [number, number, number, number];
  subspaceAnalysis: SubspaceAnalysisData;
  dimensionDeviations: number[];
  proposedPatch: {
    patchId: string;
    patternId: string;
    parameters: Record<string, unknown>;
    diffPreview: string;
    status: string;
  } | null;
}

interface BenchmarkData {
  baselineRps: number;
  remediatedRps: number;
  baselineUpstreamCalls: number;
  remediatedUpstreamCalls: number;
  baselineP99Ms: number;
  remediatedP99Ms: number;
  zeroVariance: boolean;
  benchmarkDurationMs: number;
}

interface VerificationResult {
  patchId: string;
  patternId: string;
  benchmark: BenchmarkData;
  verdict: 'PASS' | 'FAIL';
  diffPreview: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Sub-Components
// ──────────────────────────────────────────────────────────────────────────────

/** SVG Radial Gauge for Subspace Drift visualization */
const SubspaceDriftGauge: React.FC<{
  residualNorm: number;
  threshold: number;
  isAnomaly: boolean;
  vector: [number, number, number, number];
  capturedEnergy: number;
  baselineDimensions: number;
}> = ({ residualNorm, threshold, isAnomaly, vector, capturedEnergy, baselineDimensions }) => {
  const maxValue = threshold * 3;
  const normalizedValue = Math.min(residualNorm / maxValue, 1);
  const circumference = 2 * Math.PI * 100;
  const dashOffset = circumference * (1 - normalizedValue * 0.75);

  const status = residualNorm > threshold
    ? 'critical'
    : residualNorm > threshold * 0.6
      ? 'warning'
      : 'nominal';

  const metricLabels = ['Queue', 'Threads', 'DB Sat', 'Retries'];

  return (
    <div className="aegis-gauge">
      <div className="aegis-gauge__visual">
        <svg className="aegis-gauge__svg" viewBox="0 0 220 220">
          <circle
            className="aegis-gauge__track"
            cx="110"
            cy="110"
            r="100"
            strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          />
          <circle
            className={`aegis-gauge__fill aegis-gauge__fill--${status}`}
            cx="110"
            cy="110"
            r="100"
            strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
            strokeDashoffset={dashOffset}
            style={{ animation: isAnomaly ? 'gauge-pulse 1.5s ease-in-out infinite' : 'none' }}
          />
        </svg>
        <div className="aegis-gauge__center">
          <div className={`aegis-gauge__value aegis-gauge__value--${status}`}>
            {residualNorm.toFixed(1)}
          </div>
          <div className="aegis-gauge__label">E residual</div>
          <div className="aegis-gauge__threshold">threshold: {threshold.toFixed(1)}</div>
        </div>
      </div>

      <div className="aegis-gauge__metrics">
        {vector.map((val, i) => (
          <div key={i} className="aegis-gauge__metric">
            <div className="aegis-gauge__metric-value">{val.toFixed(1)}</div>
            <div className="aegis-gauge__metric-label">{metricLabels[i]}</div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--aegis-text-muted)' }}>
        Subspace: {baselineDimensions}D • Energy: {(capturedEnergy * 100).toFixed(1)}%
      </div>
    </div>
  );
};

/** Reasoning Trace log with syntax highlighting */
const ReasoningTrace: React.FC<{ justification: string }> = ({ justification }) => {
  const lines = justification.split('\n');

  const getLineClass = (line: string): string => {
    if (line.startsWith('CLASSIFICATION:') || line.startsWith('RECOMMENDED')) {
      return 'aegis-reasoning__line--classification';
    }
    if (line.includes('σ above') || line.includes('deviation')) {
      return 'aegis-reasoning__line--metric';
    }
    if (line.includes('REMEDIATION') || line.includes('activated') || line.includes('coalesce')) {
      return 'aegis-reasoning__line--recommendation';
    }
    return 'aegis-reasoning__line--normal';
  };

  return (
    <div className="aegis-reasoning">
      {lines.map((line, i) => (
        <div key={i} className={`aegis-reasoning__line ${getLineClass(line)}`}>
          {line || '\u00A0'}
        </div>
      ))}
    </div>
  );
};

/** Performance Delta comparison panel */
const PerformanceDelta: React.FC<{ benchmark: BenchmarkData | null }> = ({ benchmark }) => {
  if (!benchmark) {
    return (
      <div className="aegis-empty">
        <div className="aegis-empty__icon">📊</div>
        <div className="aegis-empty__text">
          Run shadow verification to see<br />performance delta metrics.
        </div>
      </div>
    );
  }

  const rows = [
    {
      label: 'Upstream',
      before: `${benchmark.baselineUpstreamCalls.toLocaleString()} req/s`,
      after: `${benchmark.remediatedUpstreamCalls.toLocaleString()} req/s`,
      improvement: benchmark.baselineUpstreamCalls > 0
        ? Math.round((1 - benchmark.remediatedUpstreamCalls / benchmark.baselineUpstreamCalls) * 100)
        : 0,
    },
    {
      label: 'P99 Latency',
      before: `${benchmark.baselineP99Ms} ms`,
      after: `${benchmark.remediatedP99Ms} ms`,
      improvement: benchmark.baselineP99Ms > 0
        ? Math.round((1 - benchmark.remediatedP99Ms / benchmark.baselineP99Ms) * 100)
        : 0,
    },
    {
      label: 'Variance',
      before: 'N/A',
      after: benchmark.zeroVariance ? '✓ Zero' : '✗ Drift',
      improvement: benchmark.zeroVariance ? 100 : 0,
    },
  ];

  return (
    <div className="aegis-delta">
      {rows.map((row, i) => (
        <div key={i} className="aegis-delta__row aegis-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
          <span className="aegis-delta__label">{row.label}</span>
          <span className="aegis-delta__before">{row.before}</span>
          <span className="aegis-delta__arrow">→</span>
          <span className="aegis-delta__after">{row.after}</span>
          {row.improvement > 0 && (
            <span className="aegis-delta__improvement">-{row.improvement}%</span>
          )}
        </div>
      ))}
    </div>
  );
};

/** Diff Preview with syntax highlighting */
const DiffPreview: React.FC<{ diff: string }> = ({ diff }) => {
  const lines = diff.split('\n');

  const getLineClass = (line: string): string => {
    if (line.startsWith('+')) return 'aegis-diff__line--add';
    if (line.startsWith('-')) return 'aegis-diff__line--remove';
    if (line.startsWith('@@')) return 'aegis-diff__line--header';
    return 'aegis-diff__line--context';
  };

  return (
    <div className="aegis-diff">
      {lines.map((line, i) => (
        <div key={i} className={getLineClass(line)}>
          {line || '\u00A0'}
        </div>
      ))}
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// Main Dashboard Widget
// ──────────────────────────────────────────────────────────────────────────────

const AegisDashboard: React.FC = () => {
  // ── NitroStack Widget SDK ──────────────────────────────────────────────
  const sdk = useWidgetSDK();
  const theme = useTheme();

  // ── Local State ────────────────────────────────────────────────────────
  const [classification, setClassification] = useState<ClassificationResult | null>(null);
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // ── Initialize from tool output (widget renders after classify tool) ──
  useEffect(() => {
    if (sdk) {
      const toolOutput = sdk.getToolOutput<ClassificationResult>();
      if (toolOutput) {
        setClassification(toolOutput);
      }
    }
  }, [sdk]);

  // ── Derived State ──────────────────────────────────────────────────────
  const residualNorm = classification?.subspaceAnalysis?.residualNorm ?? 0;
  const threshold = classification?.subspaceAnalysis?.threshold ?? 15.0;
  const isAnomaly = classification?.subspaceAnalysis?.isAnomaly ?? false;
  const currentVector = classification?.inputVector ?? [0, 0, 0, 0] as [number, number, number, number];
  const capturedEnergy = classification?.subspaceAnalysis?.capturedEnergy ?? 0;
  const baselineDimensions = classification?.subspaceAnalysis?.baselineDimensions ?? 0;

  const canVerify = classification?.proposedPatch != null && !verification;
  const canApply = verification?.verdict === 'PASS';

  // ── Status Badge ───────────────────────────────────────────────────────
  const statusBadge = useMemo(() => {
    if (isAnomaly) return { className: 'aegis-status-badge--anomaly', text: 'ANOMALY' };
    if (residualNorm > threshold * 0.6) return { className: 'aegis-status-badge--warning', text: 'ELEVATED' };
    return { className: 'aegis-status-badge--nominal', text: 'NOMINAL' };
  }, [isAnomaly, residualNorm, threshold]);

  // ── Handlers (invoke MCP tools via WidgetSDK) ─────────────────────────

  const handleInjectSurge = useCallback(async () => {
    if (!sdk) return;
    setIsProcessing(true);
    setProcessingStep('Injecting Salary Day surge...');
    setError(null);
    try {
      await sdk.callTool('inject_salary_day_surge', { intensity: 25, durationMs: 15000 });
      await new Promise((r) => setTimeout(r, 1500));
      setProcessingStep('Classifying bottleneck...');
      const result = await sdk.callTool('classify_bottleneck_signature', {});
      if (result?.result) {
        setClassification(JSON.parse(result.result));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Surge injection failed');
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  }, [sdk]);

  const handleVerify = useCallback(async () => {
    if (!sdk || !classification?.proposedPatch) return;
    setIsProcessing(true);
    setProcessingStep('Running shadow benchmark...');
    setError(null);
    try {
      const result = await sdk.callTool('verify_remediation_diff', {
        patchId: classification.proposedPatch.patchId,
        shadowDurationMs: 5000,
      });
      if (result?.result) {
        setVerification(JSON.parse(result.result));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  }, [sdk, classification]);

  const handleApply = useCallback(async () => {
    if (!sdk || !classification?.proposedPatch || !verification) return;
    setIsProcessing(true);
    setProcessingStep('Deploying remediation...');
    setError(null);
    try {
      // Generate a deterministic approval token
      const tokenData = `${classification.proposedPatch.patchId}:${Date.now()}:human-operator`;
      const encoder = new TextEncoder();
      const data = encoder.encode(tokenData);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const approvalToken = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      await sdk.callTool('apply_remediation_patch', {
        patchId: classification.proposedPatch.patchId,
        approvalToken,
      });

      setProcessingStep('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Patch deployment failed');
    } finally {
      setIsProcessing(false);
    }
  }, [sdk, classification, verification]);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="aegis-dashboard">
      <div className="aegis-content">
        {/* Header */}
        <header className="aegis-header">
          <div className="aegis-header__title-group">
            <div className="aegis-header__shield">🛡️</div>
            <div>
              <h1 className="aegis-header__title">Project Aegis</h1>
              <p className="aegis-header__subtitle">
                Intelligent SRE Shield • SVD Subspace Anomaly Detection
              </p>
            </div>
          </div>
          <div className="aegis-header__status">
            <span className={`aegis-status-badge ${statusBadge.className}`}>
              <span className="aegis-status-dot" />
              {statusBadge.text}
            </span>
          </div>
        </header>

        {/* Error Banner */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--aegis-radius-md)',
            padding: '12px 16px',
            marginBottom: '20px',
            color: 'var(--aegis-red)',
            fontSize: '13px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span>⚠ {error}</span>
            <button
              onClick={() => setError(null)}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '16px' }}
            >
              ×
            </button>
          </div>
        )}

        {/* Main Grid */}
        <div className="aegis-grid">
          {/* Subspace Drift Gauge */}
          <div className="aegis-grid__gauge">
            <div className="aegis-card">
              <div className="aegis-card__header">
                <h2 className="aegis-card__title">Subspace Drift</h2>
                <span className="aegis-card__badge">Live</span>
              </div>
              <SubspaceDriftGauge
                residualNorm={residualNorm}
                threshold={threshold}
                isAnomaly={isAnomaly}
                vector={currentVector}
                capturedEnergy={capturedEnergy}
                baselineDimensions={baselineDimensions}
              />
            </div>
          </div>

          {/* Agent Reasoning Trace */}
          <div className="aegis-grid__reasoning">
            <div className="aegis-card">
              <div className="aegis-card__header">
                <h2 className="aegis-card__title">Agent Reasoning Trace</h2>
                {classification && (
                  <span className="aegis-card__badge">{classification.signature}</span>
                )}
              </div>
              {classification ? (
                <ReasoningTrace justification={classification.justification} />
              ) : (
                <div className="aegis-empty">
                  <div className="aegis-empty__icon">🧠</div>
                  <div className="aegis-empty__text">
                    Inject a surge event to trigger<br />bottleneck classification.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Performance Delta */}
          <div className="aegis-grid__delta">
            <div className="aegis-card">
              <div className="aegis-card__header">
                <h2 className="aegis-card__title">Performance Delta</h2>
                {verification?.verdict && (
                  <span className="aegis-card__badge">
                    {verification.verdict === 'PASS' ? '✓ PASS' : '✗ FAIL'}
                  </span>
                )}
              </div>
              <PerformanceDelta benchmark={verification?.benchmark ?? null} />
            </div>
          </div>

          {/* Compliance Audit / Diff Preview */}
          <div className="aegis-grid__audit">
            <div className="aegis-card">
              <div className="aegis-card__header">
                <h2 className="aegis-card__title">Compliance Preview</h2>
                <span className="aegis-card__badge">Immutable</span>
              </div>
              {classification?.proposedPatch?.diffPreview ? (
                <DiffPreview diff={classification.proposedPatch.diffPreview} />
              ) : (
                <div className="aegis-empty">
                  <div className="aegis-empty__icon">📋</div>
                  <div className="aegis-empty__text">
                    No audit entries yet.<br />Actions will appear here.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Bar */}
          <div className="aegis-grid__actions">
            <div className="aegis-card">
              <div className="aegis-actions">
                <div className="aegis-actions__left">
                  <button
                    className="aegis-btn aegis-btn--primary"
                    onClick={handleInjectSurge}
                    disabled={isProcessing}
                  >
                    {isProcessing && processingStep.includes('Inject')
                      ? '⏳ Injecting...'
                      : '⚡ Inject Salary Day Surge'}
                  </button>

                  {canVerify && (
                    <button
                      className="aegis-btn aegis-btn--ghost"
                      onClick={handleVerify}
                      disabled={isProcessing}
                    >
                      {isProcessing && processingStep.includes('shadow')
                        ? '⏳ Benchmarking...'
                        : '🔬 Verify in Shadow'}
                    </button>
                  )}
                </div>

                {/* Human Sign-Off Button */}
                <button
                  className="aegis-btn aegis-btn--approve"
                  onClick={handleApply}
                  disabled={!canApply || isProcessing}
                  title={
                    !canApply
                      ? 'Verify remediation in shadow first'
                      : 'Deploy remediation pattern to live gateway'
                  }
                >
                  {isProcessing && processingStep.includes('Deploy')
                    ? '⏳ Deploying...'
                    : '✅ Approve & Deploy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AegisDashboard;
