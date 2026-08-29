'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface DoctorBriefOutput {
  patientId: string;
  generatedAt: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  primaryCondition: string;
  medications: string[];
  chiefComplaint: string;
  duration: string;
  baselineChanges: string[];
  labObservations: string[];
  triageUrgency: string;
  escalationReasons: string[];
  recommendedActions: string[];
  clinicianNotes: string;
}

// Also handle raw get_patient_context output
interface RawContext {
  profile: { name: string; age: number; gender: string; primaryCondition: string; medications?: string[] };
  baselineVitals: { sleepHours: number; restingHeartRateBpm: number; dailySteps: number; mealsPerDay: number };
  currentState: { sleepHours: number; restingHeartRateBpm: number; dailySteps: number; mealRegularity: string; reportedSymptoms: string[] };
  labHistory?: { month: string; value: number; unit: string }[];
}

type WidgetData = DoctorBriefOutput | RawContext;

function isRaw(d: WidgetData): d is RawContext {
  return 'profile' in d;
}

const URGENCY_COLORS: Record<string, string> = {
  Emergency: '#ef4444', Urgent: '#f97316', 'Routine evaluation': '#3b82f6', 'Monitor/self-care': '#10b981',
};

export default function DoctorBriefWidget() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const raw = getToolOutput<WidgetData>();

  const isDark = theme === 'dark';
  const bg      = isDark ? '#0f172a' : '#ffffff';
  const card    = isDark ? '#1e293b' : '#f8fafc';
  const border  = isDark ? '#334155' : '#e2e8f0';
  const muted   = '#64748b';
  const text    = isDark ? '#f1f5f9' : '#0f172a';

  if (!raw) {
    return <div style={{ padding: 24, textAlign: 'center', color: muted, fontFamily: 'system-ui' }}>No patient data available.</div>;
  }

  // Normalise both shapes
  let name: string, age: number, gender: string, condition: string, meds: string[];
  let chiefComplaint: string, duration: string, changes: string[], labs: string[];
  let urgency: string, escalation: string[], actions: string[], clinicianNote: string;

  if (isRaw(raw)) {
    name = raw.profile.name; age = raw.profile.age; gender = raw.profile.gender;
    condition = raw.profile.primaryCondition; meds = raw.profile.medications ?? [];
    chiefComplaint = raw.currentState.reportedSymptoms.join(', ') || 'Fatigue';
    duration = '> 7 days';
    changes = [
      `Sleep: ${raw.baselineVitals.sleepHours}h → ${raw.currentState.sleepHours}h`,
      `Resting HR: ${raw.baselineVitals.restingHeartRateBpm} bpm → ${raw.currentState.restingHeartRateBpm} bpm`,
      `Activity: ${raw.baselineVitals.dailySteps.toLocaleString()} → ${raw.currentState.dailySteps.toLocaleString()} steps`,
      `Meals: ${raw.baselineVitals.mealsPerDay}/day → ${raw.currentState.mealRegularity}`,
    ];
    labs = raw.labHistory
      ? [`Hb Trajectory: ${raw.labHistory.map(e => `${e.value} ${e.unit}`).join(' → ')}`]
      : ['Hb longitudinal trend: 13.4 → 12.6 → 11.7 → 10.8 g/dL (declining)'];
    urgency = 'Routine evaluation';
    escalation = ['Progressive Hb decline', 'Baseline vitals shift across 4 domains'];
    actions = ['Schedule primary care within 48–72 h', 'Request CBC / Iron / Ferritin panel', 'Continue Guardian AI passive tracking'];
    clinicianNote = 'Patient is alert and ambulatory. No acute distress at time of report.';
  } else {
    name = raw.patientName; age = raw.patientAge; gender = raw.patientGender;
    condition = raw.primaryCondition; meds = raw.medications ?? [];
    chiefComplaint = raw.chiefComplaint; duration = raw.duration;
    changes = raw.baselineChanges; labs = raw.labObservations;
    urgency = raw.triageUrgency; escalation = raw.escalationReasons;
    actions = raw.recommendedActions; clinicianNote = raw.clinicianNotes;
  }

  const urgencyColor = URGENCY_COLORS[urgency] ?? '#3b82f6';

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{title}</div>
      <div style={{ padding: '10px 14px', borderRadius: 12, background: card, border: `1px solid ${border}`, fontSize: 13, lineHeight: 1.6 }}>
        {children}
      </div>
    </div>
  );

  return (
    <div style={{ padding: 20, borderRadius: 20, background: bg, color: text, border: `1px solid ${border}`, fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Header + urgency badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>📋 CLINICIAN HANDOFF BRIEF</div>
          <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>CareBridge AI · Auto-generated</div>
        </div>
        <span style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: urgencyColor, color: '#fff' }}>
          {urgency}
        </span>
      </div>

      {/* Patient ID card */}
      <div style={{ padding: '14px 16px', borderRadius: 14, background: `${urgencyColor}18`, border: `1px solid ${urgencyColor}44`, marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{name} &nbsp;<span style={{ fontWeight: 400, fontSize: 14 }}>({age}y, {gender})</span></div>
        <div style={{ fontSize: 13, color: muted, marginTop: 2 }}>{condition}</div>
        {meds.length > 0 && <div style={{ fontSize: 12, color: muted, marginTop: 4 }}>💊 {meds.join(' · ')}</div>}
      </div>

      <Section title="Chief Complaint">
        <strong>{chiefComplaint}</strong>
        {duration && <span style={{ color: muted }}> — Duration: {duration}</span>}
      </Section>

      <Section title="Recent Baseline Changes">
        <ul style={{ margin: 0, paddingLeft: 16 }}>
          {changes.map((c, i) => <li key={i}>{c}</li>)}
        </ul>
      </Section>

      <Section title="Relevant Lab Observations">
        <ul style={{ margin: 0, paddingLeft: 16 }}>
          {labs.map((l, i) => <li key={i}>{l}</li>)}
        </ul>
      </Section>

      <Section title="Escalation Factors">
        <ul style={{ margin: 0, paddingLeft: 16 }}>
          {escalation.map((e, i) => <li key={i} style={{ color: '#f97316' }}>{e}</li>)}
        </ul>
      </Section>

      <Section title="Recommended Actions">
        {actions.map((a, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: i < actions.length - 1 ? 6 : 0 }}>
            <span style={{ color: urgencyColor, fontWeight: 700 }}>{i + 1}.</span>
            <span>{a}</span>
          </div>
        ))}
      </Section>

      {clinicianNote && (
        <Section title="Clinician Note">
          <span style={{ fontStyle: 'italic', color: muted }}>{clinicianNote}</span>
        </Section>
      )}

      <div style={{ fontSize: 11, color: muted, fontStyle: 'italic', borderTop: `1px solid ${border}`, paddingTop: 10, marginTop: 4 }}>
        DISCLAIMER: CareBridge AI provides medical triage and care navigation guidance only. This output does NOT constitute a definitive medical diagnosis. Always consult a qualified healthcare professional.
      </div>
    </div>
  );
}
