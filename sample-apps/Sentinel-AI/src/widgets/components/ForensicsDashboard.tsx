'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import {
  DEMO_CASE_CCTV,
  demoToExtractMetadataArgs,
  demoToVerifyEvidenceArgs,
  demoToDetectManipulationArgs,
  type DemoCase,
  type ChainOfCustodyEntry
} from '../lib/demo-cases';

// ─── Types ───────────────────────────────────────────────────────────────────

type AnalysisPhase =
  | 'idle'
  | 'step_metadata'
  | 'step_verify'
  | 'step_manipulation'
  | 'step_trustscore'
  | 'step_report'
  | 'completed'
  | 'review_required'
  | 'insufficient_data'
  | 'error';

interface AnalysisResults {
  metadataResult: Record<string, unknown> | null;
  verificationResult: Record<string, unknown> | null;
  manipulationResult: Record<string, unknown> | null;
  trustScoreResult: Record<string, unknown> | null;
  reportResult: Record<string, unknown> | null;
  compareResult: Record<string, unknown> | null;
}

interface FormData {
  caseId: string;
  evidenceId: string;
  evidenceType: string;
  hash: string;
  expectedHash: string;
  signature: string;
  timestamp: string;
  chainOfCustody: ChainOfCustodyEntry[];
  investigatorId: string;
  organization: string;
  notes: string;
}

const EMPTY_FORM: FormData = {
  caseId: '',
  evidenceId: '',
  evidenceType: 'IMAGE',
  hash: '',
  expectedHash: '',
  signature: '',
  timestamp: '',
  chainOfCustody: [],
  investigatorId: '',
  organization: '',
  notes: ''
};

const EVIDENCE_TYPES = ['IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'SYSTEM_LOG', 'DISK_IMAGE'];

const PIPELINE_STEPS = [
  { key: 'step_metadata', label: 'Metadata' },
  { key: 'step_verify', label: 'Integrity' },
  { key: 'step_manipulation', label: 'Manipulation' },
  { key: 'step_trustscore', label: 'Trust Score' },
  { key: 'step_report', label: 'Report' }
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function na(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Not available';
  return String(value);
}

function getStatusPillClass(status: unknown): string {
  const s = String(status ?? '').toLowerCase();
  if (['verified', 'matched', 'clean', 'valid', 'intact', 'verified_intact'].some(k => s.includes(k))) return 'status-pill verified';
  if (['failed', 'mismatch', 'invalid', 'broken', 'manipulated'].some(k => s.includes(k))) return 'status-pill failed';
  if (['flagged', 'suspicious', 'review'].some(k => s.includes(k))) return 'status-pill flagged';
  return 'status-pill unverified';
}

function getTrustColor(score: number): string {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#f59e0b';
  if (score >= 35) return '#ef4444';
  return '#7f1d1d';
}

function parseToolResult(result: unknown): Record<string, unknown> | null {
  if (!result) return null;
  if (typeof result === 'object') return result as Record<string, unknown>;
  if (typeof result === 'string') {
    try { return JSON.parse(result); } catch { return { raw: result }; }
  }
  return null;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function DemoBanner({ demo }: { demo: DemoCase }) {
  return (
    <div className="alert alert-warning" style={{ marginBottom: 0 }}>
      <span style={{ fontSize: 18 }}>⚠️</span>
      <div>
        <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: '0.5px', marginBottom: 4 }}>
          DEMO CASE — SAMPLE DATA ONLY
        </div>
        <div style={{ fontSize: 12, opacity: 0.9 }}>
          {demo.description}
        </div>
        {demo.suspiciousIndicators.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Intentional suspicious indicators in this scenario:
            </div>
            <ul style={{ paddingLeft: 16, margin: 0 }}>
              {demo.suspiciousIndicators.map((s, i) => (
                <li key={i} style={{ fontSize: 12 }}>{s}</li>
              ))}
            </ul>
          </div>
        )}
        <div style={{ marginTop: 6, fontSize: 11, opacity: 0.75, fontStyle: 'italic' }}>
          This sample data will be submitted to Sentinel AI's real forensic tools. The results displayed are actual tool outputs.
        </div>
      </div>
    </div>
  );
}

function PipelineStepper({ phase }: { phase: AnalysisPhase }) {
  const orderedSteps = PIPELINE_STEPS.map(s => s.key);
  const activeIdx = orderedSteps.indexOf(phase);

  return (
    <div className="pipeline-stepper">
      {PIPELINE_STEPS.map((step, i) => {
        const isCompleted = activeIdx >= 0 && i < activeIdx;
        const isActive = phase === step.key;
        const isDone = ['completed', 'review_required', 'insufficient_data'].includes(phase) || (activeIdx === -1 && false);
        const allDone = ['completed', 'review_required', 'insufficient_data', 'error'].includes(phase);

        return (
          <React.Fragment key={step.key}>
            <div className={`step-item ${isActive ? 'active' : ''} ${(isCompleted || allDone) ? 'completed' : ''}`}>
              <div className="step-number">
                {(isCompleted || allDone) ? '✓' : i + 1}
              </div>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {step.label}
                {isActive && (
                  <span style={{ display: 'inline-block', width: 12, textAlign: 'center', animation: 'blink 1s step-end infinite' }}>
                    …
                  </span>
                )}
              </span>
            </div>
            {i < PIPELINE_STEPS.length - 1 && (
              <div className={`step-line ${isCompleted || allDone ? 'active' : ''}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function TrustScoreGauge({ score, tier, admissibility }: {
  score: number | string;
  tier: string;
  admissibility: string;
}) {
  const numScore = typeof score === 'number' ? score : parseFloat(String(score));
  const displayScore = isNaN(numScore) ? 0 : Math.max(0, Math.min(100, numScore));
  const color = getTrustColor(displayScore);

  return (
    <div style={{ textAlign: 'center' }}>
      <div className="gauge-container">
        <div
          className="gauge-circle"
          style={{
            '--score-pct': displayScore * 3.6,
            '--gauge-color': color,
            background: `conic-gradient(${color} ${displayScore * 3.6}deg, #1e293b 0)`
          } as React.CSSProperties}
        >
          <div className="gauge-value-container">
            <div className="gauge-score" style={{ color }}>{displayScore}</div>
            <div className="gauge-max">/100</div>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <span className={getStatusPillClass(tier)} style={{ fontSize: 12 }}>
          {na(tier)}
        </span>
        <span className={getStatusPillClass(admissibility)} style={{ fontSize: 11 }}>
          {na(admissibility)}
        </span>
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: unknown; mono?: boolean }) {
  const display = na(value);
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '6px 0', borderBottom: '1px solid #1e293b', gap: 12 }}>
      <span style={{ fontSize: 12, color: '#94a3b8', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 12, color: '#e2e8f0', wordBreak: 'break-all', textAlign: 'right', fontFamily: mono ? 'var(--font-mono)' : undefined }}>
        {display}
      </span>
    </div>
  );
}

function StatusInfoRow({ label, value }: { label: string; value: unknown }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #1e293b', gap: 12 }}>
      <span style={{ fontSize: 12, color: '#94a3b8', flexShrink: 0 }}>{label}</span>
      <span className={getStatusPillClass(value)}>
        {na(value)}
      </span>
    </div>
  );
}

function ScorePillar({ label, score, maxScore, status, explanation }: {
  label: string;
  score: number;
  maxScore: number;
  status: string;
  explanation: string;
}) {
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
  const color = status === 'VERIFIED' ? '#10b981' : status === 'FAILED' ? '#ef4444' : status === 'FLAGGED' ? '#f59e0b' : '#64748b';

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>{label}</span>
        <span style={{ fontSize: 12, color, fontWeight: 700 }}>{score}/{maxScore}</span>
      </div>
      <div style={{ height: 6, background: '#1e293b', borderRadius: 4, overflow: 'hidden', marginBottom: 4 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: '#64748b' }}>{explanation}</span>
        <span className={getStatusPillClass(status)} style={{ fontSize: 10 }}>{status}</span>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function ForensicsDashboard() {
  const { isReady, callTool } = useWidgetSDK();

  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [phase, setPhase] = useState<AnalysisPhase>('idle');
  const [results, setResults] = useState<AnalysisResults>({
    metadataResult: null,
    verificationResult: null,
    manipulationResult: null,
    trustScoreResult: null,
    reportResult: null,
    compareResult: null
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeDemo, setActiveDemo] = useState<DemoCase | null>(null);
  const [activeTab, setActiveTab] = useState<'analyze' | 'compare'>('analyze');
  const [compareSecondaryId, setCompareSecondaryId] = useState('');
  const [compareMode, setCompareMode] = useState<'FULL' | 'HASH_ONLY' | 'METADATA_ONLY' | 'STRUCTURAL'>('FULL');
  const [reportExpanded, setReportExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Load Demo Case ────────────────────────────────────────────────────────

  const loadDemoCase = useCallback(() => {
    const demo = DEMO_CASE_CCTV;
    setActiveDemo(demo);
    setForm({
      caseId: demo.caseId,
      evidenceId: demo.evidenceId,
      evidenceType: demo.evidenceType,
      hash: demo.submittedHash,
      expectedHash: demo.expectedHash,
      signature: demo.signature,
      timestamp: demo.timestamp,
      chainOfCustody: demo.chainOfCustody,
      investigatorId: demo.investigatorId,
      organization: demo.organization,
      notes: demo.notes
    });
    setPhase('idle');
    setResults({ metadataResult: null, verificationResult: null, manipulationResult: null, trustScoreResult: null, reportResult: null, compareResult: null });
    setErrorMessage(null);
  }, []);

  const clearDemo = useCallback(() => {
    setActiveDemo(null);
    setForm(EMPTY_FORM);
    setPhase('idle');
    setResults({ metadataResult: null, verificationResult: null, manipulationResult: null, trustScoreResult: null, reportResult: null, compareResult: null });
    setErrorMessage(null);
  }, []);

  // ─── Tool Caller ──────────────────────────────────────────────────────────

  const safeCallTool = useCallback(async (toolName: string, args: Record<string, unknown>): Promise<Record<string, unknown>> => {
    if (!isReady) {
      throw new Error(`Widget SDK not ready. Cannot call tool "${toolName}" outside an MCP host.`);
    }
    const response = await callTool(toolName, args);
    if (response.isError) {
      throw new Error(`Tool "${toolName}" returned an error: ${response.result}`);
    }
    const parsed = parseToolResult(response.structuredContent ?? response.result);
    if (!parsed) throw new Error(`Tool "${toolName}" returned an unreadable response.`);
    return parsed;
  }, [isReady, callTool]);

  // ─── Analysis Orchestration ────────────────────────────────────────────────

  const runAnalysis = useCallback(async () => {
    setPhase('step_metadata');
    setErrorMessage(null);
    setResults({ metadataResult: null, verificationResult: null, manipulationResult: null, trustScoreResult: null, reportResult: null, compareResult: null });

    let metadataResult: Record<string, unknown> | null = null;
    let verificationResult: Record<string, unknown> | null = null;
    let manipulationResult: Record<string, unknown> | null = null;
    let trustScoreResult: Record<string, unknown> | null = null;
    let reportResult: Record<string, unknown> | null = null;

    const setPartial = (updates: Partial<AnalysisResults>) =>
      setResults(prev => ({ ...prev, ...updates }));

    try {
      // Step 1: extractMetadata
      const metaArgs = activeDemo
        ? demoToExtractMetadataArgs(activeDemo)
        : { evidenceId: form.evidenceId, fileType: form.evidenceType === 'IMAGE' ? 'image/jpeg' : `${form.evidenceType.toLowerCase()}/${form.evidenceType.toLowerCase()}`, deepScan: true, hash: form.hash || undefined, expectedHash: form.expectedHash || undefined, timestamp: form.timestamp || undefined };

      metadataResult = await safeCallTool('extractMetadata', metaArgs);
      setPartial({ metadataResult });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`[extractMetadata] ${msg}`);
      setPhase('error');
      return;
    }

    try {
      // Step 2: verifyEvidence
      setPhase('step_verify');
      const verifyArgs = activeDemo
        ? demoToVerifyEvidenceArgs(activeDemo)
        : {
            evidenceId: form.evidenceId,
            evidenceType: form.evidenceType,
            hash: form.hash || undefined,
            expectedHash: form.expectedHash || undefined,
            signature: form.signature || undefined,
            timestamp: form.timestamp || undefined,
            chainOfCustody: form.chainOfCustody.length > 0 ? form.chainOfCustody : undefined
          };

      verificationResult = await safeCallTool('verifyEvidence', verifyArgs);
      setPartial({ verificationResult });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`[verifyEvidence] ${msg}`);
      setPhase('error');
      return;
    }

    try {
      // Step 3: detectManipulation
      setPhase('step_manipulation');
      const manipArgs = activeDemo
        ? demoToDetectManipulationArgs(activeDemo)
        : { evidenceId: form.evidenceId, analysisTypes: ['ELA_COMPRESSION', 'DEEPFAKE_SYNTHETIC', 'METADATA_INCONSISTENCY', 'SPLICE_DETECTION'], sensitivity: 'MEDIUM' };

      manipulationResult = await safeCallTool('detectManipulation', manipArgs);
      setPartial({ manipulationResult });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`[detectManipulation] ${msg}`);
      setPhase('error');
      return;
    }

    try {
      // Step 4: calculateTrustScore — passing actual prior results
      setPhase('step_trustscore');
      const trustArgs: Record<string, unknown> = {
        evidenceId: form.evidenceId || activeDemo?.evidenceId,
        verificationResult,
        manipulationResult,
        metadataResult
      };

      trustScoreResult = await safeCallTool('calculateTrustScore', trustArgs);
      setPartial({ trustScoreResult });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`[calculateTrustScore] ${msg}`);
      setPhase('error');
      return;
    }

    try {
      // Step 5: generateForensicReport — passing all prior results
      setPhase('step_report');
      const reportArgs: Record<string, unknown> = {
        evidenceId: form.evidenceId || activeDemo?.evidenceId,
        caseId: form.caseId || activeDemo?.caseId,
        investigatorId: form.investigatorId || activeDemo?.investigatorId || 'Unspecified',
        organization: form.organization || activeDemo?.organization || 'Sentinel AI Integrity Lab',
        notes: form.notes || activeDemo?.notes || undefined,
        metadataResult,
        verificationResult,
        manipulationResult,
        trustScoreResult
      };

      reportResult = await safeCallTool('generateForensicReport', reportArgs);
      setPartial({ reportResult });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`[generateForensicReport] ${msg}`);
      setPhase('error');
      return;
    }

    // Determine final state
    const trust = trustScoreResult;
    const tier = String(trust?.trustTier ?? '');
    const verifyStatus = String(verificationResult?.status ?? '');
    const manipDetected = Boolean(manipulationResult?.manipulationDetected);
    const evaluated = Number(trust?.evaluatedIndicatorsCount ?? 0);
    const unverified = Number(trust?.unverifiedIndicatorsCount ?? 0);

    if (tier === 'UNVERIFIED_INCOMPLETE' || evaluated === 0 || (unverified >= 4)) {
      setPhase('insufficient_data');
    } else if (manipDetected || verifyStatus === 'FAILED' || tier === 'HIGH_RISK_SUSPICIOUS' || tier === 'COMPROMISED_INVALID') {
      setPhase('review_required');
    } else {
      setPhase('completed');
    }
  }, [form, activeDemo, safeCallTool]);

  // ─── Compare Evidence ──────────────────────────────────────────────────────

  const runCompare = useCallback(async () => {
    if (!form.evidenceId && !activeDemo?.evidenceId) return;
    try {
      const primaryId = form.evidenceId || activeDemo?.evidenceId || '';
      const compareArgs: Record<string, unknown> = {
        primaryEvidenceId: primaryId,
        secondaryEvidenceId: compareSecondaryId,
        comparisonMode: compareMode
      };
      const compareResult = await safeCallTool('compareEvidence', compareArgs);
      setResults(prev => ({ ...prev, compareResult }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`[compareEvidence] ${msg}`);
    }
  }, [form.evidenceId, activeDemo, compareSecondaryId, compareMode, safeCallTool]);

  // ─── Render helpers ───────────────────────────────────────────────────────

  const trustScore = results.trustScoreResult;
  const numScore = parseFloat(String(trustScore?.trustScore ?? '0'));
  const scoreDisplay = isNaN(numScore) ? 0 : numScore;
  const subBreakdown = trustScore?.subScoreBreakdown as Record<string, { score: number; maxScore: number; status: string; explanation: string }> | undefined;

  const canAnalyze = isReady && (
    (form.evidenceId.trim() && form.caseId.trim()) || activeDemo !== null
  );

  // ─── JSX ─────────────────────────────────────────────────────────────────

  return (
    <div className="dashboard-container">
      {/* ── Header ── */}
      <div className="dashboard-header">
        <div className="brand-title">
          <span className="brand-icon">🛡️</span>
          <div>
            <h1>Sentinel AI</h1>
            <div className="brand-subtitle">Digital Evidence Intelligence Platform</div>
          </div>
        </div>
        <div className="header-actions">
          {activeDemo && (
            <span className="badge badge-demo">⚠️ DEMO CASE</span>
          )}
          <span className={`badge ${isReady ? 'badge-mcp-connected' : 'badge-mcp-standalone'}`}>
            {isReady ? '🟢 MCP Connected' : '⚪ Standalone Mode'}
          </span>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {(['analyze', 'compare'] as const).map(tab => (
          <button
            key={tab}
            className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-secondary'}`}
            style={{ textTransform: 'capitalize' }}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'analyze' ? '🔬 Analyze Evidence' : '⚖️ Compare Evidence'}
          </button>
        ))}
      </div>

      {/* ── Analyze Tab ── */}
      {activeTab === 'analyze' && (
        <>
          {/* Pipeline Stepper — only visible when analyzing */}
          {phase !== 'idle' && <PipelineStepper phase={phase} />}

          <div className="grid-layout">
            {/* ── Left Panel: Intake Form ── */}
            <div>
              {/* Demo Banner */}
              {activeDemo && (
                <div className="card" style={{ marginBottom: 20, padding: 0 }}>
                  <div style={{ padding: 16 }}>
                    <DemoBanner demo={activeDemo} />
                  </div>
                  <div style={{ padding: '0 16px 16px' }}>
                    <button className="btn btn-secondary" style={{ width: '100%', fontSize: 12 }} onClick={clearDemo}>
                      ✕ Clear Demo — Enter Real Case Data
                    </button>
                  </div>
                </div>
              )}

              {/* Intake Card */}
              <div className="card">
                <div className="card-header">
                  <span className="card-title">📁 Evidence Intake</span>
                  {!activeDemo && (
                    <button className="btn btn-demo" style={{ fontSize: 12, padding: '6px 12px' }} onClick={loadDemoCase}>
                      ⚡ Load Demo Case
                    </button>
                  )}
                </div>

                {!activeDemo && (
                  <div
                    className="dropzone"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                      e.preventDefault();
                      const file = e.dataTransfer.files[0];
                      if (file && !form.evidenceId) {
                        setForm(prev => ({ ...prev, evidenceId: `EVD-${Date.now().toString(36).toUpperCase()}` }));
                      }
                    }}
                  >
                    <div className="dropzone-icon">📂</div>
                    <div className="dropzone-text">Drop evidence file here or click to select</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      Supported: Image, Video, Audio, Document, Disk Image
                    </div>
                    <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={e => {
                      const file = e.target.files?.[0];
                      if (file && !form.evidenceId) {
                        setForm(prev => ({ ...prev, evidenceId: `EVD-${Date.now().toString(36).toUpperCase()}` }));
                      }
                    }} />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Case ID *</label>
                  <input className="form-input" value={form.caseId} onChange={e => setForm(p => ({ ...p, caseId: e.target.value }))} placeholder="CASE-2026-XXXX" readOnly={!!activeDemo} />
                </div>
                <div className="form-group">
                  <label className="form-label">Evidence ID *</label>
                  <input className="form-input" value={form.evidenceId} onChange={e => setForm(p => ({ ...p, evidenceId: e.target.value }))} placeholder="EVD-2026-XXXX" readOnly={!!activeDemo} />
                </div>
                <div className="form-group">
                  <label className="form-label">Evidence Type</label>
                  <select className="form-select" value={form.evidenceType} onChange={e => setForm(p => ({ ...p, evidenceType: e.target.value }))} disabled={!!activeDemo}>
                    {EVIDENCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Reference Hash (SHA-256) — from acquisition log</label>
                  <input className="form-input font-mono" value={form.expectedHash} onChange={e => setForm(p => ({ ...p, expectedHash: e.target.value }))} placeholder="Expected hash at time of acquisition..." readOnly={!!activeDemo} style={{ fontSize: 11 }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Submitted File Hash</label>
                  <input className="form-input font-mono" value={form.hash} onChange={e => setForm(p => ({ ...p, hash: e.target.value }))} placeholder="Computed hash of file being submitted..." readOnly={!!activeDemo} style={{ fontSize: 11 }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Digital Signature (optional)</label>
                  <input className="form-input font-mono" value={form.signature} onChange={e => setForm(p => ({ ...p, signature: e.target.value }))} placeholder="PKI signature string..." readOnly={!!activeDemo} style={{ fontSize: 11 }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Acquisition Timestamp</label>
                  <input className="form-input" value={form.timestamp} onChange={e => setForm(p => ({ ...p, timestamp: e.target.value }))} placeholder="ISO 8601, e.g. 2026-07-29T02:15:33Z" readOnly={!!activeDemo} />
                </div>
                <div className="form-group">
                  <label className="form-label">Investigator ID</label>
                  <input className="form-input" value={form.investigatorId} onChange={e => setForm(p => ({ ...p, investigatorId: e.target.value }))} placeholder="ID or name of forensic examiner" readOnly={!!activeDemo} />
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea className="form-textarea" rows={3} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Investigator observations..." readOnly={!!activeDemo} style={{ resize: 'vertical' }} />
                </div>

                {/* Chain of custody preview */}
                {form.chainOfCustody.length > 0 && (
                  <div className="form-group">
                    <label className="form-label">Chain of Custody Log ({form.chainOfCustody.length} entries)</label>
                    <div style={{ background: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: 6, padding: 10 }}>
                      {form.chainOfCustody.map((entry, i) => (
                        <div key={i} style={{ fontSize: 11, color: '#94a3b8', padding: '4px 0', borderBottom: i < form.chainOfCustody.length - 1 ? '1px solid #1e293b' : undefined }}>
                          <span style={{ fontFamily: 'var(--font-mono)', color: '#64748b' }}>{entry.timestamp}</span>
                          {' · '}<span style={{ color: '#e2e8f0' }}>{entry.handler}</span>
                          {' · '}{entry.action}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* MCP not ready warning */}
                {!isReady && (
                  <div className="alert alert-info" style={{ marginBottom: 12 }}>
                    <span>ℹ️</span>
                    <span style={{ fontSize: 12 }}>
                      Widget is running in standalone mode. Connect this widget to an MCP host to enable live analysis.
                    </span>
                  </div>
                )}

                <button
                  id="analyze-btn"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '12px', fontSize: 14 }}
                  onClick={runAnalysis}
                  disabled={!canAnalyze || ['step_metadata', 'step_verify', 'step_manipulation', 'step_trustscore', 'step_report'].includes(phase)}
                >
                  {['step_metadata', 'step_verify', 'step_manipulation', 'step_trustscore', 'step_report'].includes(phase)
                    ? '⏳ Analyzing…'
                    : '🔬 Analyze Evidence'}
                </button>
                {!isReady && (
                  <p style={{ fontSize: 11, color: '#64748b', textAlign: 'center', marginTop: 8 }}>
                    Requires active MCP host connection
                  </p>
                )}
              </div>
            </div>

            {/* ── Right Panel: Results ── */}
            <div>
              {/* IDLE State */}
              {phase === 'idle' && !activeDemo && (
                <div className="card" style={{ textAlign: 'center', padding: 48 }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
                  <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: '#e2e8f0' }}>
                    Ready for Evidence Analysis
                  </h2>
                  <p style={{ color: '#64748b', fontSize: 13, maxWidth: 360, margin: '0 auto 24px' }}>
                    Enter a case ID and evidence ID, provide hash and signature data, then click Analyze Evidence to run the forensic pipeline.
                  </p>
                  <button className="btn btn-demo" onClick={loadDemoCase} style={{ margin: '0 auto' }}>
                    ⚡ Load Demo Case — CCTV Incident
                  </button>
                </div>
              )}

              {/* IDLE State with demo loaded */}
              {phase === 'idle' && activeDemo && (
                <div className="card" style={{ textAlign: 'center', padding: 36 }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🎬</div>
                  <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, color: '#fbbf24' }}>
                    DEMO CASE Loaded
                  </h2>
                  <p style={{ color: '#94a3b8', fontSize: 13, maxWidth: 360, margin: '0 auto 8px' }}>
                    {activeDemo.label}
                  </p>
                  <p style={{ color: '#64748b', fontSize: 12, maxWidth: 400, margin: '0 auto 20px' }}>
                    Click "Analyze Evidence" to run the actual forensic tools against these sample inputs.
                  </p>
                  <div className="badge badge-demo" style={{ margin: '0 auto' }}>⚠️ SAMPLE DATA — FOR DEMONSTRATION ONLY</div>
                </div>
              )}

              {/* ERROR State */}
              {phase === 'error' && (
                <div className="card">
                  <div className="alert alert-danger">
                    <span style={{ fontSize: 20 }}>⚠️</span>
                    <div>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>Tool Execution Error</div>
                      <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>{errorMessage || 'An unknown error occurred.'}</div>
                    </div>
                  </div>
                  <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => { setPhase('idle'); setErrorMessage(null); }}>
                    ← Back to Intake Form
                  </button>
                </div>
              )}

              {/* INSUFFICIENT_DATA State */}
              {phase === 'insufficient_data' && (
                <div className="card">
                  <div className="alert alert-info">
                    <span style={{ fontSize: 20 }}>ℹ️</span>
                    <div>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>Insufficient Data for Assessment</div>
                      <div style={{ fontSize: 12 }}>
                        Too many indicators are unverified. Provide a reference hash, digital signature, or chain of custody log for a meaningful trust score.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* RESULTS CARDS (for completed, review_required, insufficient_data) */}
              {(['completed', 'review_required', 'insufficient_data'].includes(phase)) && (
                <>
                  {/* Status banner */}
                  {phase === 'review_required' && (
                    <div className="alert alert-danger" style={{ marginBottom: 20 }}>
                      <span style={{ fontSize: 20 }}>🚨</span>
                      <div>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>REVIEW REQUIRED — Suspicious Indicators Detected</div>
                        <div style={{ fontSize: 12 }}>One or more forensic checks failed or flagged anomalies. Manual expert review is recommended.</div>
                      </div>
                    </div>
                  )}
                  {phase === 'completed' && (
                    <div className="alert" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', marginBottom: 20 }}>
                      <span style={{ fontSize: 20 }}>✅</span>
                      <div>
                        <div style={{ fontWeight: 700 }}>Analysis Completed</div>
                        <div style={{ fontSize: 12 }}>All evaluated checks passed. Review the results below.</div>
                      </div>
                    </div>
                  )}

                  {/* Demo badge reminder */}
                  {activeDemo && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                      <span className="badge badge-demo">⚠️ DEMO CASE — RESULTS BASED ON SAMPLE INPUTS</span>
                    </div>
                  )}

                  {/* Trust Score Card */}
                  {trustScore && (
                    <div className="card">
                      <div className="card-header">
                        <span className="card-title">🎯 Trust & Authenticity Score</span>
                        <span style={{ fontSize: 12, color: '#64748b' }}>
                          {trustScore.evaluatedIndicatorsCount as number} of 5 indicators evaluated
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 24, alignItems: 'start' }}>
                        <TrustScoreGauge
                          score={scoreDisplay}
                          tier={String(trustScore.trustTier ?? 'UNKNOWN')}
                          admissibility={String(trustScore.admissibilitySupportAssessment ?? 'INSUFFICIENT_DATA')}
                        />
                        <div>
                          {subBreakdown && Object.entries(subBreakdown).map(([key, pillar]) => (
                            <ScorePillar
                              key={key}
                              label={key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                              score={pillar.score}
                              maxScore={pillar.maxScore}
                              status={pillar.status}
                              explanation={pillar.explanation}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Risk Factors */}
                      {Array.isArray(trustScore.riskFactors) && (trustScore.riskFactors as string[]).length > 0 && (
                        <div style={{ marginTop: 16 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#fbbf24', marginBottom: 8 }}>⚠️ Risk Factors</div>
                          {(trustScore.riskFactors as string[]).map((rf, i) => (
                            <div key={i} style={{ fontSize: 12, color: '#fca5a5', display: 'flex', alignItems: 'flex-start', gap: 8, padding: '4px 0' }}>
                              <span style={{ color: '#ef4444', flexShrink: 0 }}>•</span>
                              {rf}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Integrity Card */}
                  {results.verificationResult && (
                    <div className="card">
                      <div className="card-header">
                        <span className="card-title">🔐 Integrity Verification</span>
                        <span className={getStatusPillClass(results.verificationResult.status)}>
                          {na(results.verificationResult.status)}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>
                        {na(results.verificationResult.details)}
                      </div>
                      {Boolean(results.verificationResult.hashDetails) && (() => {
                        const hd = results.verificationResult!.hashDetails as Record<string, unknown>;
                        return (
                          <>
                            <StatusInfoRow label="Hash Status" value={hd.status} />
                            <InfoRow label="Computed Hash" value={hd.computedHash} mono />
                            <InfoRow label="Reference Hash" value={hd.expectedHash} mono />
                          </>
                        );
                      })()}
                      {Boolean(results.verificationResult.signatureDetails) && (() => {
                        const sd = results.verificationResult!.signatureDetails as Record<string, unknown>;
                        return <StatusInfoRow label="Digital Signature" value={sd.status} />;
                      })()}
                      {Boolean(results.verificationResult.chainOfCustody) && (() => {
                        const coc = results.verificationResult!.chainOfCustody as Record<string, unknown>;
                        return <StatusInfoRow label="Chain of Custody" value={coc.status} />;
                      })()}
                    </div>
                  )}

                  {/* Metadata Card */}
                  {results.metadataResult && (
                    <div className="card">
                      <div className="card-header">
                        <span className="card-title">📋 Metadata Assessment</span>
                        <span className={getStatusPillClass(results.metadataResult.extractionStatus)}>
                          {na(results.metadataResult.extractionStatus)}
                        </span>
                      </div>
                      <InfoRow label="Evidence ID" value={(results.metadataResult.availableMetadata as Record<string, unknown> | undefined)?.evidenceId ?? results.metadataResult.evidenceId} />
                      <InfoRow label="File Type" value={(results.metadataResult.fileTypeInfo as Record<string, unknown> | undefined)?.inferredCategory} />
                      <InfoRow label="Extension" value={(results.metadataResult.suppliedFileInfo as Record<string, unknown> | undefined)?.extension} />
                      <InfoRow label="Hash in Metadata" value={(results.metadataResult.unavailableMetadata as Record<string, unknown> | undefined) ? ((results.metadataResult.unavailableMetadata as Record<string, unknown>).hashes as Record<string, unknown> | undefined)?.sha256 ?? ((results.metadataResult.availableMetadata as Record<string, unknown> | undefined)?.hash) : 'Not available'} mono />
                      {Array.isArray(results.metadataResult.warnings) && (results.metadataResult.warnings as string[]).length > 0 && (
                        <div style={{ marginTop: 10 }}>
                          {(results.metadataResult.warnings as string[]).map((w, i) => (
                            <div key={i} style={{ fontSize: 11, color: '#64748b', padding: '3px 0', display: 'flex', gap: 6 }}>
                              <span>ℹ️</span>{w}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Manipulation Card */}
                  {results.manipulationResult && (
                    <div className="card">
                      <div className="card-header">
                        <span className="card-title">🔍 Manipulation Analysis</span>
                        <span className={getStatusPillClass(results.manipulationResult.status)}>
                          {na(results.manipulationResult.status)}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>
                        {na(results.manipulationResult.analysisSummary)}
                      </div>
                      <InfoRow label="Confidence Score" value={results.manipulationResult.overallConfidenceScore !== undefined ? `${results.manipulationResult.overallConfidenceScore}%` : 'Not available'} />
                      <InfoRow label="Anomalies Detected" value={results.manipulationResult.anomalyCount} />
                      <InfoRow label="Applied Routines" value={Array.isArray(results.manipulationResult.appliedRoutines) ? (results.manipulationResult.appliedRoutines as string[]).join(', ') : 'Not available'} />

                      {Array.isArray(results.manipulationResult.detectedAnomalies) && (results.manipulationResult.detectedAnomalies as unknown[]).length > 0 && (
                        <div style={{ marginTop: 12 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#fbbf24', marginBottom: 6 }}>Detected Anomalies</div>
                          {(results.manipulationResult.detectedAnomalies as Array<Record<string, unknown>>).map((a, i) => (
                            <div key={i} className="alert alert-warning" style={{ padding: '8px 12px', marginBottom: 6 }}>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 12 }}>{na(a.type)} — {na(a.severity)}</div>
                                <div style={{ fontSize: 11, marginTop: 2 }}>{na(a.description)}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Forensic Report */}
                  {results.reportResult && (
                    <div className="card">
                      <div className="card-header">
                        <span className="card-title">📄 Forensic Decision-Support Report</span>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '4px 10px', fontSize: 11 }}
                          onClick={() => {
                            const text = String(results.reportResult?.reportDocument ?? '');
                            navigator.clipboard?.writeText(text);
                          }}
                        >
                          📋 Copy
                        </button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                        <InfoRow label="Report ID" value={results.reportResult.reportId} />
                        <InfoRow label="Generated At" value={results.reportResult.generatedAt} />
                      </div>
                      <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className={getStatusPillClass((results.reportResult.summary as Record<string, unknown> | undefined)?.admissibilitySupportAssessment)}>
                          {na((results.reportResult.summary as Record<string, unknown> | undefined)?.admissibilitySupportAssessment)}
                        </span>
                        <span style={{ fontSize: 12, color: '#64748b' }}>Admissibility-Support Assessment</span>
                      </div>
                      <button
                        className="btn btn-secondary"
                        style={{ width: '100%', marginBottom: 8, fontSize: 12 }}
                        onClick={() => setReportExpanded(p => !p)}
                      >
                        {reportExpanded ? '▲ Hide Full Report' : '▼ View Full Report'}
                      </button>
                      {reportExpanded && (
                        <div className="report-content">
                          {String(results.reportResult.reportDocument ?? 'Report content not available')}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Compare Tab ── */}
      {activeTab === 'compare' && (
        <div className="card" style={{ maxWidth: 700 }}>
          <div className="card-header">
            <span className="card-title">⚖️ Compare Evidence Items</span>
          </div>
          <div className="form-group">
            <label className="form-label">Primary Evidence ID</label>
            <input className="form-input" value={form.evidenceId || activeDemo?.evidenceId || ''} readOnly placeholder="Run analysis first or set evidence ID" />
          </div>
          <div className="form-group">
            <label className="form-label">Secondary Evidence ID (for comparison)</label>
            <input className="form-input" value={compareSecondaryId} onChange={e => setCompareSecondaryId(e.target.value)} placeholder="EVD-2026-XXXX (the comparison item)" />
          </div>
          <div className="form-group">
            <label className="form-label">Comparison Mode</label>
            <select className="form-select" value={compareMode} onChange={e => setCompareMode(e.target.value as typeof compareMode)}>
              {['FULL', 'HASH_ONLY', 'METADATA_ONLY', 'STRUCTURAL'].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <button
            className="btn btn-primary"
            style={{ width: '100%', marginBottom: 20 }}
            onClick={runCompare}
            disabled={!isReady || !compareSecondaryId}
          >
            ⚖️ Compare Evidence
          </button>
          {!isReady && (
            <p style={{ fontSize: 11, color: '#64748b', textAlign: 'center', marginBottom: 16 }}>Requires active MCP host connection</p>
          )}

          {results.compareResult && (
            <>
              <div style={{ marginBottom: 8 }}>
                <span className={getStatusPillClass(results.compareResult.verdict)}>
                  {na(results.compareResult.verdict)}
                </span>
              </div>
              <InfoRow label="Match Percentage" value={results.compareResult.matchPercentage !== undefined ? `${results.compareResult.matchPercentage}%` : 'Not available'} />
              <InfoRow label="Diff Summary" value={results.compareResult.diffSummary} />
              {Array.isArray(results.compareResult.attributeComparison) && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: '#94a3b8' }}>Attribute Comparison</div>
                  {(results.compareResult.attributeComparison as Array<Record<string, unknown>>).map((attr, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, padding: '6px 0', borderBottom: '1px solid #1e293b', fontSize: 12 }}>
                      <span style={{ color: '#64748b' }}>{na(attr.attribute)}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{na(attr.primary)}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{na(attr.secondary)}</span>
                      <span className={getStatusPillClass(attr.matched ? 'MATCHED' : 'MISMATCH')}>{attr.matched ? 'MATCH' : 'DIFF'}</span>
                    </div>
                  ))}
                </div>
              )}
              {results.compareResult.admissibilitySupportNotes && (
                <div className="alert alert-info" style={{ marginTop: 12 }}>
                  <span>ℹ️</span>
                  <span style={{ fontSize: 12 }}>{String(results.compareResult.admissibilitySupportNotes)}</span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <style>{`
        @keyframes blink { 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}
