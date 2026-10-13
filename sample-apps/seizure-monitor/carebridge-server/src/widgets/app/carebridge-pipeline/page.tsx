'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface PipelineResult {
  pipelineVersion: string;
  userMessage: string;
  guardianAnalysis: {
    deviationDetected: boolean;
    signals: string[];
    status: string;
    details: { sleepChange: string; hrChange: string; activityChange: string; mealChange: string };
  };
  patientSummary: {
    name: string;
    age: number;
    gender: string;
    primaryCondition: string;
    currentSymptoms: string[];
  };
  historicalIntelligence: {
    testName: string;
    trendDirection: string;
    observationSummary: string;
    clinicalRelevance: string;
  };
  triageFollowUpQuestions: { id: string; questionText: string; options: string[] }[];
  redFlagAssessment: {
    isRedFlagTriggered: boolean;
    matchedRedFlags: string[];
    urgency: string;
    recommendedAction: string;
  };
  finalUrgencyClassification: string;
  escalationFactors: string[];
  safetyDisclaimer: string;
}

const urgencyColors: Record<string, { bg: string; text: string; border: string }> = {
  Emergency:              { bg: '#ef4444', text: '#fff', border: '#dc2626' },
  Urgent:                 { bg: '#f97316', text: '#fff', border: '#ea580c' },
  'Routine evaluation':   { bg: '#3b82f6', text: '#fff', border: '#2563eb' },
  'Monitor/self-care':    { bg: '#10b981', text: '#fff', border: '#059669' },
};

export default function CarebridgePipelineWidget() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput<PipelineResult>();

  const isDark = theme === 'dark';
  const surface  = isDark ? '#1e293b' : '#ffffff';
  const surface2 = isDark ? '#0f172a' : '#f8fafc';
  const border   = isDark ? '#334155' : '#e2e8f0';
  const muted    = '#64748b';
  const textPrimary = isDark ? '#f1f5f9' : '#0f172a';

  if (!data) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: muted, fontFamily: 'system-ui' }}>
        Awaiting patient input…
      </div>
    );
  }

  const urgencyStyle = urgencyColors[data.finalUrgencyClassification] ?? urgencyColors['Monitor/self-care'];

  return (
    <div
      role="region"
      aria-label="CAREBRIDGE AI Intelligence Pipeline Overview"
      aria-live="polite"
      style={{ padding: 20, fontFamily: 'system-ui, -apple-system, sans-serif', color: textPrimary, display: 'flex', flexDirection: 'column', gap: 14 }}
    >

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>🧠 CAREBRIDGE AI Intelligence Pipeline</h2>
          <div style={{ fontSize: 13, color: muted, marginTop: 2 }}>v{data.pipelineVersion} · Full end-to-end workflow</div>
        </div>
        <span
          role="status"
          aria-label={`Urgency: ${data.finalUrgencyClassification}`}
          style={{
            padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700,
            background: urgencyStyle.bg, color: urgencyStyle.text,
          }}
        >
          {data.finalUrgencyClassification}
        </span>
      </div>

      {/* Patient message */}
      <div style={{ padding: '10px 14px', borderRadius: 10, background: surface2, border: `1px solid ${border}`, fontSize: 14, fontStyle: 'italic', color: muted }}>
        "{data.userMessage}"
      </div>

      {/* Patient Summary */}
      <Section title="👤 Patient" surface={surface2} border={border}>
        <b>{data.patientSummary.name}</b> ({data.patientSummary.age}y, {data.patientSummary.gender}) — {data.patientSummary.primaryCondition}
        <div style={{ marginTop: 4, color: muted, fontSize: 13 }}>Symptoms: {data.patientSummary.currentSymptoms.join(', ')}</div>
      </Section>

      {/* Guardian Analysis */}
      <Section title="🛡️ Guardian AI — Baseline Shifts" surface={surface2} border={border}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {Object.entries(data.guardianAnalysis.details).map(([k, v]) => (
            <div key={k} style={{ padding: '8px 10px', borderRadius: 8, background: isDark ? '#1e293b' : '#fff', border: `1px solid ${border}` }}>
              <div style={{ fontSize: 11, color: muted, textTransform: 'capitalize' }}>{k.replace('Change', '')}</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: data.guardianAnalysis.deviationDetected ? '#f97316' : '#10b981' }}>
          {data.guardianAnalysis.deviationDetected ? `⚠ ${data.guardianAnalysis.signals.length} signal(s) detected` : '✓ Vitals within baseline range'}
        </div>
      </Section>

      {/* Health Intelligence */}
      <Section title="📊 Health Intelligence — Lab Trend" surface={surface2} border={border}>
        <div style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#38bdf8' : '#0284c7' }}>{data.historicalIntelligence.observationSummary}</div>
        <div style={{ fontSize: 12, color: muted, marginTop: 6, lineHeight: 1.5 }}>{data.historicalIntelligence.clinicalRelevance}</div>
      </Section>

      {/* Triage Questions */}
      <Section title="🩺 Triage Follow-up Questions" surface={surface2} border={border}>
        {data.triageFollowUpQuestions.map((q) => (
          <div key={q.id} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{q.questionText}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              {q.options.map((opt) => (
                <span key={opt} style={{ padding: '3px 10px', borderRadius: 12, background: isDark ? '#334155' : '#e2e8f0', fontSize: 12 }}>{opt}</span>
              ))}
            </div>
          </div>
        ))}
      </Section>

      {/* Red Flag Assessment */}
      <Section title="🚨 Red-Flag Safety Assessment" surface={surface2} border={border}>
        <div style={{ fontSize: 13, fontWeight: 600, color: data.redFlagAssessment.isRedFlagTriggered ? '#ef4444' : '#10b981' }}>
          {data.redFlagAssessment.isRedFlagTriggered ? '⚠ Red flag triggered' : '✓ No emergency red flags detected'}
        </div>
        <div style={{ fontSize: 13, marginTop: 6, padding: '8px 12px', borderRadius: 8, borderLeft: `3px solid ${urgencyStyle.bg}`, background: isDark ? '#1e293b' : '#fff' }}>
          <b>Action:</b> {data.redFlagAssessment.recommendedAction}
        </div>
      </Section>

      {/* Escalation Factors */}
      {data.escalationFactors.length > 0 && (
        <Section title="📋 Escalation Factors" surface={surface2} border={border}>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7 }}>
            {data.escalationFactors.map((f, i) => <li key={i}>{f}</li>)}
          </ul>
        </Section>
      )}

      {/* Disclaimer */}
      <div style={{ fontSize: 11, color: muted, fontStyle: 'italic', borderTop: `1px solid ${border}`, paddingTop: 10 }}>
        {data.safetyDisclaimer}
      </div>
    </div>
  );
}

function Section({ title, children, surface, border }: { title: string; children: React.ReactNode; surface: string; border: string }) {
  return (
    <div style={{ borderRadius: 12, background: surface, border: `1px solid ${border}`, padding: '12px 14px' }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 13 }}>{children}</div>
    </div>
  );
}
