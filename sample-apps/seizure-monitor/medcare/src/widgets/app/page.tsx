'use client';

import { useTheme } from '@nitrostack/widgets';

const WIDGETS = [
  {
    path: '/medication-authenticity',
    name: 'Medication Authenticity Report',
    agent: 'Agent 2',
    emoji: '🔍',
    description: 'Verify medication authenticity via FDA NDC registry, recall checks, and counterfeit batch detection.',
    tags: ['NDC Lookup', 'Recall Check', 'Counterfeit'],
    color: '#0f62fe',
  },
  {
    path: '/drug-safety',
    name: 'Drug Safety Report',
    agent: 'Agent 2',
    emoji: '🧬',
    description: 'Cross-reference medications against patient genetic profiles for gene-drug conflicts and drug interactions.',
    tags: ['Pharmacogenomics', 'Interactions', 'Gene Risk'],
    color: '#0f62fe',
  },
  {
    path: '/patient-profile',
    name: 'Patient Profile',
    agent: 'Agent 1',
    emoji: '👤',
    description: 'View multi-generational family health profiles with conditions, medications, and genetic markers.',
    tags: ['Health Memory', 'Lab Data', 'Family'],
    color: '#198038',
  },
  {
    path: '/emergency-card',
    name: 'Emergency Medical Card',
    agent: 'Agent 3',
    emoji: '🚨',
    description: 'High-contrast critical care card for first responders with blood type, allergies, and emergency contacts.',
    tags: ['Blood Type', 'Allergies', 'Emergency'],
    color: '#da1e28',
  },
  {
    path: '/caregiver-briefing',
    name: 'Weekly Caregiver Briefing',
    agent: 'Agent 3',
    emoji: '📋',
    description: 'AI-synthesized weekly summary per family member with health trends, medication flags, and care tasks.',
    tags: ['Weekly Summary', 'Briefing', 'Care Tasks'],
    color: '#6929c4',
  },
  {
    path: '/calculator-result',
    name: 'Calculator Result',
    agent: 'Utility',
    emoji: '🔢',
    description: 'Perform basic arithmetic calculations with a detailed or compact view toggle.',
    tags: ['Calculator', 'Arithmetic', 'Utility'],
    color: '#8a3ffc',
  },
];

const AGENT_COLORS: Record<string, string> = {
  'Agent 1': '#198038',
  'Agent 2': '#0f62fe',
  'Agent 3': '#da1e28',
  'Utility': '#8a3ffc',
};

export default function WidgetIndex() {
  const theme = useTheme();
  const isDark = theme === 'dark';

  const bg = isDark ? '#161616' : '#f4f4f4';
  const cardBg = isDark ? '#262626' : '#ffffff';
  const textPrimary = isDark ? '#f4f4f4' : '#161616';
  const textSecondary = isDark ? '#a8a8a8' : '#525252';
  const borderColor = isDark ? '#393939' : '#e0e0e0';

  return (
    <div style={{
      minHeight: '100vh',
      background: bg,
      padding: '2rem 1.5rem',
      fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
    }}>
      {/* Header */}
      <div style={{ maxWidth: '720px', margin: '0 auto 2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '1.75rem' }}>🏥</span>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: textPrimary }}>
            Family MedCare Ecosystem
          </h1>
        </div>
        <p style={{ margin: 0, fontSize: '0.9375rem', color: textSecondary, lineHeight: '1.6' }}>
          NitroStack MCP Server · IBM Carbon Widget Preview · {WIDGETS.length} widgets across 3 agents
        </p>
        <div style={{
          marginTop: '1rem',
          padding: '0.75rem 1rem',
          background: isDark ? '#1c3a5e' : '#edf5ff',
          borderLeft: '3px solid #0f62fe',
          borderRadius: '0 4px 4px 0',
          fontSize: '0.8125rem',
          color: isDark ? '#a6c8ff' : '#0043ce',
        }}>
          💡 These widgets render inside NitroStack Studio after tool calls. This page is for standalone development preview only.
        </div>
      </div>

      {/* Widget Cards */}
      <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {WIDGETS.map((w) => (
          <a
            key={w.path}
            href={w.path}
            style={{ textDecoration: 'none', display: 'block' }}
          >
            <div style={{
              background: cardBg,
              border: `1px solid ${borderColor}`,
              borderRadius: '4px',
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '1rem',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              cursor: 'pointer',
            }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = w.color;
                (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 0 1px ${w.color}`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = borderColor;
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
              }}
            >
              {/* Emoji icon */}
              <div style={{
                fontSize: '1.5rem',
                lineHeight: 1,
                flexShrink: 0,
                marginTop: '2px',
              }}>
                {w.emoji}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 600, color: textPrimary }}>{w.name}</span>
                  <span style={{
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    padding: '0.125rem 0.5rem',
                    borderRadius: '100px',
                    background: AGENT_COLORS[w.agent] + '20',
                    color: AGENT_COLORS[w.agent],
                    letterSpacing: '0.04em',
                  }}>
                    {w.agent}
                  </span>
                </div>
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.8125rem', color: textSecondary, lineHeight: '1.5' }}>
                  {w.description}
                </p>
                <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                  {w.tags.map(tag => (
                    <span key={tag} style={{
                      fontSize: '0.6875rem',
                      padding: '0.125rem 0.5rem',
                      borderRadius: '2px',
                      background: isDark ? '#393939' : '#f4f4f4',
                      color: textSecondary,
                      border: `1px solid ${borderColor}`,
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Arrow */}
              <div style={{ color: textSecondary, fontSize: '1rem', flexShrink: 0, marginTop: '2px' }}>→</div>
            </div>
          </a>
        ))}
      </div>

      {/* Footer */}
      <p style={{
        maxWidth: '720px',
        margin: '2rem auto 0',
        textAlign: 'center',
        fontSize: '0.75rem',
        color: textSecondary,
      }}>
        Family MedCare Ecosystem · HealthTech Hackathon · IBM Carbon Design System
      </p>
    </div>
  );
}
