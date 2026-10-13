'use client';

import { useTheme, useWidgetState, useWidgetSDK } from '@nitrostack/widgets';
import { useEffect, useState } from 'react';

/**
 * PharmaGuard Agent Trace Widget
 * 
 * Shows a real-time animated visualization of the AI's multi-agent
 * decision pipeline — making the "black box" fully transparent.
 * 
 * Each tool call appears as an animated block showing:
 * - Which agent handled it (Patient / Safety / AYUSH / Report)
 * - What tool was invoked
 * - What it found (pass/fail)
 * - Source citation
 */

// ── Types ────────────────────────────────────────────────────────────────

interface CheckResult {
  type: string;
  flagged: boolean;
  severity?: string;
  detail?: string;
  citation?: string;
}

interface AggregatedData {
  overallRisk: string;
  riskScore: number;
  totalChecks: number;
  flaggedChecks: CheckResult[];
  recommendation: string;
  _traceInput?: CheckResult[];  // The full checks array passed in
}

// ── Agent metadata mapping ──────────────────────────────────────────────

const AGENT_MAP: Record<string, { agent: string; agentIcon: string; agentColor: string; tool: string; label: string }> = {
  drug_interaction: {
    agent: 'Safety Agent', agentIcon: '🛡️', agentColor: '#3b82f6',
    tool: 'check_drug_drug_interaction', label: 'Drug-Drug Interaction',
  },
  allergy: {
    agent: 'Safety Agent', agentIcon: '🛡️', agentColor: '#3b82f6',
    tool: 'check_drug_allergy_conflict', label: 'Allergy Cross-Reactivity',
  },
  disease: {
    agent: 'Safety Agent', agentIcon: '🛡️', agentColor: '#3b82f6',
    tool: 'check_disease_conflict', label: 'Disease Contraindication',
  },
  age: {
    agent: 'Safety Agent', agentIcon: '🛡️', agentColor: '#3b82f6',
    tool: 'check_age_appropriateness', label: 'Age Appropriateness (Beers)',
  },
  renal: {
    agent: 'Safety Agent', agentIcon: '🛡️', agentColor: '#3b82f6',
    tool: 'check_renal_dose_adjustment', label: 'Renal Dose Adjustment',
  },
  pregnancy: {
    agent: 'Safety Agent', agentIcon: '🛡️', agentColor: '#3b82f6',
    tool: 'check_pregnancy_safety', label: 'Pregnancy Safety',
  },
  duplicate: {
    agent: 'Safety Agent', agentIcon: '🛡️', agentColor: '#3b82f6',
    tool: 'check_duplicate_therapy', label: 'Duplicate Therapy',
  },
  ayush: {
    agent: 'AYUSH Agent', agentIcon: '🌿', agentColor: '#22c55e',
    tool: 'check_ayush_interaction', label: 'AYUSH Herb-Drug Interaction',
  },
  patient_load: {
    agent: 'Patient Agent', agentIcon: '🏥', agentColor: '#8b5cf6',
    tool: 'get_patient_profile', label: 'Patient Profile Loaded',
  },
  extraction: {
    agent: 'Safety Agent', agentIcon: '🛡️', agentColor: '#3b82f6',
    tool: 'extract_clinical_entities', label: 'Clinical Entity Extraction',
  },
  aggregation: {
    agent: 'Report Agent', agentIcon: '📊', agentColor: '#f59e0b',
    tool: 'aggregate_risk_score', label: 'Risk Aggregation',
  },
};

const DEFAULT_META = {
  agent: 'Safety Agent', agentIcon: '🛡️', agentColor: '#3b82f6',
  tool: 'unknown', label: 'Safety Check',
};

// ── Component ───────────────────────────────────────────────────────────

export default function AgentTrace() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();
  const [visibleCount, setVisibleCount] = useState(0);

  const isDark = theme === 'dark';

  // Build the trace steps from tool output
  const data = isReady ? getToolOutput<AggregatedData>() : null;

  // Build steps: patient load + extraction + all checks + aggregation
  const allChecks: CheckResult[] = data
    ? [
        // Synthetic step: patient was loaded
        { type: 'patient_load', flagged: false, detail: 'Patient profile retrieved from EHR database', citation: 'Patient EHR' },
        // Synthetic step: extraction
        { type: 'extraction', flagged: false, detail: 'Parsed prescription note into structured entities via Gemini LLM', citation: 'Gemini LLM' },
        // Real checks from aggregate input
        ...(data._traceInput || data.flaggedChecks || []),
        // Synthetic step: aggregation itself
        { type: 'aggregation', flagged: data.riskScore > 0, severity: data.overallRisk === 'high_risk' ? 'major' : data.overallRisk === 'caution' ? 'moderate' : undefined, detail: `${data.riskScore} concern(s) flagged → ${data.overallRisk.replace('_', ' ').toUpperCase()}`, citation: 'PharmaGuard Multi-Agent Pipeline' },
      ]
    : [];

  // Animate blocks appearing one by one
  useEffect(() => {
    if (allChecks.length === 0) return;
    if (visibleCount >= allChecks.length) return;

    const timer = setTimeout(() => {
      setVisibleCount(prev => Math.min(prev + 1, allChecks.length));
    }, visibleCount === 0 ? 300 : 400);

    return () => clearTimeout(timer);
  }, [visibleCount, allChecks.length]);

  // Reset visible count when data changes
  useEffect(() => {
    if (data) setVisibleCount(0);
  }, [data?.totalChecks]);

  if (!isReady) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        color: isDark ? '#94a3b8' : '#64748b',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>🧠</div>
        Initializing AI pipeline...
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        color: isDark ? '#94a3b8' : '#64748b',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>⏳</div>
        Waiting for agent pipeline data...
      </div>
    );
  }

  const riskColor = data.overallRisk === 'high_risk' ? '#ef4444' : data.overallRisk === 'caution' ? '#f59e0b' : '#10b981';

  return (
    <div style={{
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      maxWidth: '580px',
      borderRadius: '16px',
      overflow: 'hidden',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
      background: isDark
        ? 'linear-gradient(180deg, #0c0f1a 0%, #111827 100%)'
        : 'linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)',
      boxShadow: isDark
        ? '0 8px 32px rgba(0,0,0,0.5)'
        : '0 8px 32px rgba(0,0,0,0.08)',
    }}>

      {/* ── Header ── */}
      <div style={{
        padding: '16px 20px',
        background: isDark
          ? 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(139,92,246,0.08))'
          : 'linear-gradient(135deg, rgba(59,130,246,0.06), rgba(139,92,246,0.06))',
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '22px' }}>🧠</span>
          <div>
            <div style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: isDark ? '#818cf8' : '#6366f1',
              marginBottom: '1px',
            }}>
              AI THINKING TRACE
            </div>
            <div style={{
              fontSize: '14px',
              fontWeight: 600,
              color: isDark ? '#e2e8f0' : '#1e293b',
            }}>
              Multi-Agent Safety Pipeline
            </div>
          </div>
        </div>
        <div style={{
          padding: '4px 10px',
          borderRadius: '20px',
          background: `${riskColor}18`,
          border: `1px solid ${riskColor}40`,
          fontSize: '11px',
          fontWeight: 700,
          color: riskColor,
          letterSpacing: '0.05em',
        }}>
          {data.totalChecks} CHECKS · {data.riskScore} FLAGGED
        </div>
      </div>

      {/* ── Agent Legend ── */}
      <div style={{
        padding: '10px 20px',
        display: 'flex',
        gap: '14px',
        flexWrap: 'wrap',
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
      }}>
        {[
          { icon: '🏥', name: 'Patient', color: '#8b5cf6' },
          { icon: '🛡️', name: 'Safety', color: '#3b82f6' },
          { icon: '🌿', name: 'AYUSH', color: '#22c55e' },
          { icon: '📊', name: 'Report', color: '#f59e0b' },
        ].map((a) => (
          <div key={a.name} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            color: isDark ? '#94a3b8' : '#64748b',
          }}>
            <span style={{ fontSize: '13px' }}>{a.icon}</span>
            <span style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: a.color, display: 'inline-block',
            }} />
            <span style={{ fontWeight: 600 }}>{a.name}</span>
          </div>
        ))}
      </div>

      {/* ── Trace Steps ── */}
      <div style={{ padding: '16px 20px' }}>
        {allChecks.map((check, idx) => {
          const meta = AGENT_MAP[check.type] || { ...DEFAULT_META, label: check.type };
          const isVisible = idx < visibleCount;
          const isFlagged = check.flagged;

          // Status indicator
          const statusIcon = isFlagged
            ? (check.severity === 'major' ? '🔴' : '🟡')
            : '🟢';
          const statusLabel = isFlagged
            ? (check.severity === 'major' ? 'FLAGGED (MAJOR)' : check.severity === 'moderate' ? 'FLAGGED' : 'FLAGGED')
            : 'PASSED';
          const statusColor = isFlagged
            ? (check.severity === 'major' ? '#ef4444' : '#f59e0b')
            : '#10b981';

          return (
            <div key={idx} style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(12px)',
              transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              marginBottom: idx < allChecks.length - 1 ? '2px' : 0,
            }}>
              {/* Connector line */}
              {idx > 0 && (
                <div style={{
                  width: '2px',
                  height: '8px',
                  background: isDark
                    ? `linear-gradient(180deg, ${(AGENT_MAP[allChecks[idx - 1]?.type] || DEFAULT_META).agentColor}60, ${meta.agentColor}60)`
                    : `linear-gradient(180deg, ${(AGENT_MAP[allChecks[idx - 1]?.type] || DEFAULT_META).agentColor}40, ${meta.agentColor}40)`,
                  marginLeft: '19px',
                }} />
              )}

              {/* Step block */}
              <div style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
                padding: '10px 12px',
                borderRadius: '10px',
                background: isFlagged
                  ? (isDark ? `${statusColor}0a` : `${statusColor}06`)
                  : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)'),
                border: `1px solid ${isFlagged ? `${statusColor}25` : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)')}`,
              }}>
                {/* Agent icon circle */}
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: `${meta.agentColor}15`,
                  border: `2px solid ${meta.agentColor}50`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  flexShrink: 0,
                }}>
                  {meta.agentIcon}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Agent + Tool name */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '3px',
                    gap: '8px',
                  }}>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: isDark ? '#e2e8f0' : '#1e293b',
                    }}>
                      {meta.label}
                    </div>
                    <div style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: `${statusColor}18`,
                      color: statusColor,
                      letterSpacing: '0.05em',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                    }}>
                      {statusIcon} {statusLabel}
                    </div>
                  </div>

                  {/* Agent name + tool name */}
                  <div style={{
                    fontSize: '11px',
                    color: meta.agentColor,
                    fontWeight: 600,
                    marginBottom: '4px',
                    fontFamily: 'monospace',
                  }}>
                    {meta.agent} → {meta.tool}
                  </div>

                  {/* Detail */}
                  {check.detail && (
                    <div style={{
                      fontSize: '12px',
                      color: isDark ? '#94a3b8' : '#64748b',
                      lineHeight: '1.5',
                    }}>
                      {check.detail}
                    </div>
                  )}

                  {/* Citation */}
                  {check.citation && (
                    <div style={{
                      fontSize: '10px',
                      color: isDark ? '#475569' : '#94a3b8',
                      marginTop: '3px',
                      fontStyle: 'italic',
                    }}>
                      📎 {check.citation}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading indicator while animating */}
        {visibleCount < allChecks.length && visibleCount > 0 && (
          <div style={{
            textAlign: 'center',
            padding: '8px',
            color: isDark ? '#818cf8' : '#6366f1',
            fontSize: '12px',
            fontWeight: 600,
          }}>
            <span style={{
              display: 'inline-block',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}>
              ⏳ Agent processing...
            </span>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div style={{
        padding: '10px 20px',
        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '10px',
        color: isDark ? '#475569' : '#94a3b8',
      }}>
        <span>🧠 Explainable AI — Full Decision Trace</span>
        <span style={{
          padding: '2px 8px',
          borderRadius: '4px',
          background: `${riskColor}15`,
          color: riskColor,
          fontWeight: 700,
          letterSpacing: '0.05em',
        }}>
          {data.overallRisk.replace('_', ' ').toUpperCase()}
        </span>
      </div>

      {/* CSS animation keyframe */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
