'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface TriageData {
  urgency?: string;
  currentUrgency?: string;
  isRedFlagTriggered?: boolean;
  matchedRedFlags?: string[];
  escalationFactors?: string[];
  recommendedAction?: string;
  disclaimer?: string;
  // start_triage also returns these
  triageStatus?: string;
  reportedSymptoms?: string[];
  followUpQuestions?: { id: string; questionText: string; options: string[] }[];
}

const URGENCY_THEMES: Record<string, { bg: string; glow: string; text: string; emoji: string; label: string }> = {
  'Emergency':            { bg: '#ef4444', glow: 'rgba(239,68,68,0.25)',   text: '#fff', emoji: '🔴', label: 'EMERGENCY'           },
  'Urgent':               { bg: '#f97316', glow: 'rgba(249,115,22,0.25)',  text: '#fff', emoji: '🟠', label: 'URGENT'               },
  'Routine evaluation':   { bg: '#3b82f6', glow: 'rgba(59,130,246,0.25)', text: '#fff', emoji: '🔵', label: 'ROUTINE EVALUATION'    },
  'Monitor/self-care':    { bg: '#10b981', glow: 'rgba(16,185,129,0.25)', text: '#fff', emoji: '🟢', label: 'MONITOR / SELF-CARE'  },
};

export default function TriageResultWidget() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput<TriageData>();

  const isDark  = theme === 'dark';
  const bg      = isDark ? '#0f172a' : '#ffffff';
  const card    = isDark ? '#1e293b' : '#f8fafc';
  const border  = isDark ? '#334155' : '#e2e8f0';
  const muted   = '#64748b';
  const text    = isDark ? '#f1f5f9' : '#0f172a';

  const urgencyKey = data?.urgency ?? data?.currentUrgency ?? 'Monitor/self-care';
  const t = URGENCY_THEMES[urgencyKey] ?? URGENCY_THEMES['Monitor/self-care'];

  const factors = data?.escalationFactors ?? [];

  return (
    <div
      role="region"
      aria-label="Medical Triage Assessment Result"
      aria-live="polite"
      style={{ padding: 20, borderRadius: 20, background: bg, color: text, border: `1px solid ${border}`, fontFamily: 'system-ui, -apple-system, sans-serif' }}
    >

      {/* Header */}
      <h2 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 16px 0' }}>🩺 TRIAGE RESULT</h2>

      {/* Urgency Badge — hero element */}
      <div
        role="alert"
        aria-label={`Triage Urgency Category: ${t.label}`}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
          padding: '20px 24px', borderRadius: 16, marginBottom: 18,
          background: t.bg, boxShadow: `0 0 24px ${t.glow}`,
        }}
      >
        <span style={{ fontSize: 32 }}>{t.emoji}</span>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: t.text, letterSpacing: '0.04em' }}>{t.label}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>Urgency classification</div>
        </div>
      </div>

      {/* Factors considered */}
      {factors.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Factors Considered</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {factors.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 12px', borderRadius: 10, background: card, border: `1px solid ${border}`, fontSize: 13 }}>
                <span style={{ color: t.bg, fontWeight: 700, marginTop: 1 }}>•</span>
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Follow-up questions (start_triage) */}
      {data?.followUpQuestions && data.followUpQuestions.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Follow-up Questions</div>
          {data.followUpQuestions.map((q) => (
            <div key={q.id} style={{ marginBottom: 10, padding: '10px 12px', borderRadius: 10, background: card, border: `1px solid ${border}` }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{q.questionText}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {q.options.map((opt) => (
                  <span key={opt} style={{ padding: '3px 10px', borderRadius: 20, background: isDark ? '#334155' : '#e2e8f0', fontSize: 12 }}>{opt}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recommended Action */}
      {data?.recommendedAction && (
        <div style={{ padding: '12px 16px', borderRadius: 12, borderLeft: `4px solid ${t.bg}`, background: isDark ? '#1e293b' : '#f8fafc', fontSize: 13, fontWeight: 500, marginBottom: 14, lineHeight: 1.5 }}>
          <span style={{ color: muted, fontSize: 11, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recommended Next Step</span>
          {data.recommendedAction}
        </div>
      )}

      {/* Disclaimer */}
      <div style={{ fontSize: 11, color: muted, fontStyle: 'italic', borderTop: `1px solid ${border}`, paddingTop: 10 }}>
        {data?.disclaimer ?? 'CareBridge AI provides medical triage and care navigation guidance only. Not a medical diagnosis.'}
      </div>
    </div>
  );
}
