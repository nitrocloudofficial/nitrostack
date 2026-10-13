'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MemberSummary {
  patient_id: string;
  name: string;
  relationship: string;
  age: number;
  overall_health: 'stable' | 'monitor' | 'attention_required';
  active_flags: number;
  medication_count: number;
  condition_count: number;
  briefing_sections: {
    health_overview?: string;
    medication_review?: string;
    genetic_summary?: string;
    care_tasks?: string[];
    emergency_guidance?: string;
  };
  flag_tags: Array<{ label: string; type: string }>;
}

interface CaregiverBriefingData {
  week_of: string;
  generated_at: string;
  family_name?: string;
  members: MemberSummary[];
}

interface PromptMessageData {
  role: string;
  content: string;
}

type WidgetData = CaregiverBriefingData | PromptMessageData[];

// ---------------------------------------------------------------------------
// Dev fallback data
// ---------------------------------------------------------------------------

const DEV_MOCK: CaregiverBriefingData = {
  week_of: '2024-11-04',
  generated_at: new Date().toISOString(),
  family_name: 'Krishnamurthy',
  members: [
    {
      patient_id: 'P001',
      name: 'Arthur Krishnamurthy',
      relationship: 'Grandfather',
      age: 74,
      overall_health: 'monitor',
      active_flags: 2,
      medication_count: 3,
      condition_count: 4,
      briefing_sections: {
        health_overview: 'HbA1c at 7.4% (above target of <7%). INR at 2.3 — within therapeutic range. eGFR stable at 68.',
        medication_review: '⚠️ Warfarin: CYP2C19 Poor Metabolizer — monitor INR closely. Metformin: SLCO1B1 variant — low-grade interaction, continue with monitoring.',
        genetic_summary: 'CYP2C19 (Poor Metabolizer): affects Warfarin and Clopidogrel. SLCO1B1 (Decreased Function): affects statin choice.',
        care_tasks: [
          'INR check due: within next 2 weeks (last: 2024-11-01)',
          'HbA1c retest recommended: 3 months (Jan 2025)',
          'Cardiology follow-up: schedule for AF management review',
        ],
        emergency_guidance: 'Seek immediate care if: unusual bleeding, severe headache, sudden vision changes (warfarin risk), or chest palpitations (AF).',
      },
      flag_tags: [
        { label: 'HbA1c High', type: 'teal' },
        { label: 'CYP2C19 Alert', type: 'red' },
      ],
    },
    {
      patient_id: 'P003',
      name: 'Priya Krishnamurthy',
      relationship: 'Child',
      age: 12,
      overall_health: 'stable',
      active_flags: 1,
      medication_count: 0,
      condition_count: 0,
      briefing_sections: {
        health_overview: 'No active conditions. CBC within normal range. TPMT enzyme activity confirmed intermediate.',
        medication_review: 'No active medications. No safety flags this week.',
        genetic_summary: 'TPMT Intermediate Activity: Critical only if immunosuppressants ever needed. Dose reduction of 30-70% required if thiopurines prescribed.',
        care_tasks: [
          'Annual wellness exam: due April 2025',
          'Keep Penicillin allergy card updated in school medical records',
        ],
        emergency_guidance: 'Seek immediate care if: hives or throat swelling after any antibiotic (Penicillin cross-reaction risk). Carry epinephrine auto-injector if prescribed.',
      },
      flag_tags: [
        { label: 'Penicillin Allergy', type: 'red' },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const HEALTH_CONFIG = {
  stable: { color: '#24a148', label: '🟢 Stable' },
  monitor: { color: '#f1c21b', label: '🟡 Monitor' },
  attention_required: { color: '#da1e28', label: '🔴 Attention Required' },
};

function getTagColor(type: string) {
  switch (type) {
    case 'red': return '#da1e28';
    case 'teal': return '#005d5d';
    case 'green': return '#24a148';
    case 'cyan': return '#017d73';
    case 'blue': return '#0f62fe';
    case 'warm-gray': return '#697077';
    case 'purple': return '#8a3ffc';
    default: return '#8d8d8d';
  }
}

// ---------------------------------------------------------------------------
// Widget Component
// ---------------------------------------------------------------------------

export default function CaregiverBriefingWidget() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();
  const liveData = getToolOutput<WidgetData>();
  const rawData = liveData ?? (isReady ? null : DEV_MOCK);
  const isDark = theme === 'dark';

  const bgColor = isDark ? '#161616' : '#ffffff';
  const textColor = isDark ? '#f4f4f4' : '#161616';
  const secondaryColor = isDark ? '#c6c6c6' : '#525252';
  const borderColor = isDark ? '#393939' : '#e0e0e0';

  if (!rawData) {
    return <div style={{ padding: 16 }}>No data received from tool.</div>;
  }

  if (Array.isArray(rawData)) {
    const lastMessage = rawData[rawData.length - 1];
    return (
      <div style={{
        backgroundColor: bgColor,
        color: textColor,
        padding: '16px',
        borderRadius: '8px',
        border: `1px solid ${borderColor}`,
        fontFamily: 'sans-serif',
        maxWidth: '520px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>Caregiver Briefing</div>
        </div>
        <div style={{ fontSize: '14px', color: secondaryColor, whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
          {lastMessage?.content || 'Briefing generated. Please review the full response above.'}
        </div>
      </div>
    );
  }

  const briefing = rawData as CaregiverBriefingData;

  return (
    <div style={{ maxWidth: '520px', fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div style={{
        backgroundColor: bgColor,
        color: textColor,
        padding: '16px',
        borderRadius: '8px',
        border: `1px solid ${borderColor}`,
        boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: secondaryColor, fontWeight: 'bold' }}>
            Weekly Caregiver Briefing
          </div>
          <div style={{ margin: '4px 0 0', fontSize: '16px', fontWeight: 'bold' }}>
            {briefing.family_name || 'Family'} — Week of {briefing.week_of}
          </div>
        </div>
        <div style={{ backgroundColor: '#0f62fe22', color: '#0f62fe', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
          {briefing.members?.length || 0} Members
        </div>
      </div>

      {/* Family Members */}
      {(briefing.members || []).map((member) => {
        const cfg = HEALTH_CONFIG[member.overall_health] || HEALTH_CONFIG.stable;

        return (
          <details key={member.patient_id} open style={{
            backgroundColor: bgColor,
            color: textColor,
            borderRadius: '8px',
            border: `1px solid ${borderColor}`,
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
            marginBottom: '12px',
          }}>
            <summary style={{
              padding: '12px 16px',
              cursor: 'pointer',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px',
              borderBottom: `1px solid ${borderColor}55`,
              userSelect: 'none'
            }}>
              <span style={{ fontSize: '14px', marginRight: '4px' }}>{member.name}</span>
              <span style={{ backgroundColor: `${cfg.color}22`, color: cfg.color, padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>{cfg.label}</span>
              {member.active_flags > 0 && (
                <span style={{ backgroundColor: '#da1e2822', color: '#da1e28', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
                  {member.active_flags} Flag{member.active_flags !== 1 ? 's' : ''}
                </span>
              )}
              {member.flag_tags?.map((ft, j) => {
                const color = getTagColor(ft.type);
                return (
                  <span key={j} style={{ backgroundColor: `${color}22`, color, padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
                    {ft.label}
                  </span>
                );
              })}
            </summary>

            <div style={{ padding: '16px' }}>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                <span style={{ backgroundColor: '#e0e0e0', color: '#161616', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>Age {member.age}</span>
                <span style={{ backgroundColor: '#e0e0e0', color: '#161616', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>{member.relationship}</span>
                <span style={{ backgroundColor: '#005d5d22', color: '#005d5d', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>{member.medication_count} Meds</span>
                <span style={{ backgroundColor: member.condition_count > 0 ? '#69707722' : '#24a14822', color: member.condition_count > 0 ? '#697077' : '#24a148', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
                  {member.condition_count} Conditions
                </span>
              </div>

              {/* Health Overview */}
              {member.briefing_sections?.health_overview && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 'bold', color: secondaryColor, marginBottom: '4px' }}>
                    📊 Health Overview
                  </div>
                  <div style={{ fontSize: '13px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                    {member.briefing_sections.health_overview}
                  </div>
                </div>
              )}

              {/* Medication Review */}
              {member.briefing_sections?.medication_review && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 'bold', color: secondaryColor, marginBottom: '4px' }}>
                    💊 Medication Safety Review
                  </div>
                  <div style={{ fontSize: '13px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                    {member.briefing_sections.medication_review}
                  </div>
                </div>
              )}

              {/* Genetic Summary */}
              {member.briefing_sections?.genetic_summary && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 'bold', color: secondaryColor, marginBottom: '4px' }}>
                    🧬 Genetic Summary
                  </div>
                  <div style={{ fontSize: '13px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                    {member.briefing_sections.genetic_summary}
                  </div>
                </div>
              )}

              {/* Care Tasks */}
              {member.briefing_sections?.care_tasks && member.briefing_sections.care_tasks.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 'bold', color: secondaryColor, marginBottom: '4px' }}>
                    ✅ Upcoming Care Tasks
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    {member.briefing_sections.care_tasks.map((task, ti) => (
                      <li key={ti} style={{ fontSize: '13px', marginBottom: '4px' }}>
                        {task}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Emergency Guidance */}
              {member.briefing_sections?.emergency_guidance && (
                <div style={{
                  padding: '10px 12px',
                  backgroundColor: '#fff1f1',
                  borderRadius: '4px',
                  borderLeft: '3px solid #da1e28',
                  color: '#161616'
                }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 'bold', color: '#da1e28', marginBottom: '4px' }}>
                    🚨 When to Seek Immediate Care
                  </div>
                  <div style={{ fontSize: '13px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                    {member.briefing_sections.emergency_guidance}
                  </div>
                </div>
              )}
            </div>
          </details>
        );
      })}

      <div style={{
        marginTop: '8px',
        fontSize: '11px',
        color: secondaryColor,
        textAlign: 'right',
      }}>
        Generated: {briefing.generated_at ? new Date(briefing.generated_at).toLocaleString() : 'Just now'}
      </div>
    </div>
  );
}
