/**
 * CAREBRIDGE AI - Synthetic Patient Health Dataset
 * Milestone 1 Foundation
 */

export interface PatientProfile {
  id: string;
  name: string;
  age: number;
  gender: string;
  primaryCondition: string;
  allergies: string[];
  medications: string[];
}

export interface HealthBaseline {
  sleepHours: number;          // e.g. 7.3 h/night
  restingHeartRateBpm: number; // e.g. 70 bpm
  dailySteps: number;          // e.g. 7,800 steps/day
  mealsPerDay: number;         // e.g. 3 meals/day
}

export interface CurrentHealthState {
  sleepHours: number;          // e.g. 5.1 h/night
  restingHeartRateBpm: number; // e.g. 82 bpm
  dailySteps: number;          // e.g. 4,100 steps/day
  mealRegularity: string;      // e.g. "Irregular"
  reportedSymptoms: string[];  // e.g. ["Fatigue"]
  recordedAt: string;
}

export interface LabResultEntry {
  month: string;               // e.g. "January", "March", "May", "July"
  date: string;
  testName: string;            // e.g. "Hemoglobin (Hb)"
  value: number;               // e.g. 13.4, 12.6, 11.7, 10.8
  unit: string;                // e.g. "g/dL"
  referenceRange: string;      // e.g. "12.0 - 15.5 g/dL"
  flag?: 'normal' | 'low' | 'high' | 'critical';
}

export interface HealthTimelineEvent {
  id: string;
  date: string;
  category: 'lab_result' | 'vitals_change' | 'clinical_visit' | 'symptom_report';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'urgent' | 'critical';
}

export interface DoctorBriefSchema {
  patientId: string;
  generatedAt: string;
  chiefComplaint: string;
  vitalsDeviationSummary: string[];
  longitudinalLabObservations: string[];
  triageUrgency: 'Emergency' | 'Urgent' | 'Routine evaluation' | 'Monitor/self-care';
  recommendedActions: string[];
}

export const DEMO_PATIENT: PatientProfile = {
  id: "PAT-88421",
  name: "Eleanor Vance",
  age: 68,
  gender: "Female",
  primaryCondition: "Mild Hypertension & Chronic Fatigue Monitoring",
  allergies: ["Penicillin"],
  medications: ["Lisinopril 10mg daily", "Multivitamin"]
};

export const DEMO_PATIENT_BASELINE: HealthBaseline = {
  sleepHours: 7.3,
  restingHeartRateBpm: 70,
  dailySteps: 7800,
  mealsPerDay: 3
};

export const DEMO_PATIENT_CURRENT: CurrentHealthState = {
  sleepHours: 5.1,
  restingHeartRateBpm: 82,
  dailySteps: 4100,
  mealRegularity: "Irregular",
  reportedSymptoms: ["Fatigue", "Mild dizziness"],
  recordedAt: "2026-07-31T08:00:00Z"
};

export const DEMO_PATIENT_LAB_HISTORY: LabResultEntry[] = [
  {
    month: "January",
    date: "2026-01-15",
    testName: "Hemoglobin (Hb)",
    value: 13.4,
    unit: "g/dL",
    referenceRange: "12.0 - 15.5 g/dL",
    flag: "normal"
  },
  {
    month: "March",
    date: "2026-03-20",
    testName: "Hemoglobin (Hb)",
    value: 12.6,
    unit: "g/dL",
    referenceRange: "12.0 - 15.5 g/dL",
    flag: "normal"
  },
  {
    month: "May",
    date: "2026-05-18",
    testName: "Hemoglobin (Hb)",
    value: 11.7,
    unit: "g/dL",
    referenceRange: "12.0 - 15.5 g/dL",
    flag: "low"
  },
  {
    month: "July",
    date: "2026-07-28",
    testName: "Hemoglobin (Hb)",
    value: 10.8,
    unit: "g/dL",
    referenceRange: "12.0 - 15.5 g/dL",
    flag: "low"
  }
];

export const DEMO_PATIENT_TIMELINE: HealthTimelineEvent[] = [
  {
    id: "EVT-101",
    date: "2026-01-15",
    category: "lab_result",
    title: "Routine Annual Blood Work",
    description: "Hemoglobin baseline at 13.4 g/dL. All vitals stable.",
    severity: "info"
  },
  {
    id: "EVT-102",
    date: "2026-03-20",
    category: "lab_result",
    title: "Follow-up Lab Test",
    description: "Hemoglobin slightly decreased to 12.6 g/dL.",
    severity: "info"
  },
  {
    id: "EVT-103",
    date: "2026-05-18",
    category: "lab_result",
    title: "Bi-monthly Lab Check",
    description: "Hemoglobin dropped to 11.7 g/dL (Below normal reference lower bound).",
    severity: "warning"
  },
  {
    id: "EVT-104",
    date: "2026-07-25",
    category: "vitals_change",
    title: "Guardian Vitals Shift Detected",
    description: "Sleep reduced from 7.3h to 5.1h; Resting HR increased from 70 to 82 bpm.",
    severity: "warning"
  },
  {
    id: "EVT-105",
    date: "2026-07-28",
    category: "lab_result",
    title: "Recent Lab Panel",
    description: "Hemoglobin down to 10.8 g/dL showing steady downward trajectory.",
    severity: "urgent"
  },
  {
    id: "EVT-106",
    date: "2026-07-31",
    category: "symptom_report",
    title: "Patient Self-Reported Fatigue",
    description: "Patient reports persistent fatigue and irregular meal schedule over the past week.",
    severity: "urgent"
  }
];

export const DEMO_DOCTOR_BRIEF_TEMPLATE: DoctorBriefSchema = {
  patientId: DEMO_PATIENT.id,
  generatedAt: "2026-07-31T10:00:00Z",
  chiefComplaint: "Progressive fatigue combined with sleep reduction and heart rate elevation over 7 days.",
  vitalsDeviationSummary: [
    "Sleep: 7.3 h -> 5.1 h (-30% drop)",
    "Resting HR: 70 bpm -> 82 bpm (+17% increase)",
    "Daily Activity: 7,800 steps -> 4,100 steps (-47% drop)",
    "Meal Pattern: 3 meals/day -> Irregular"
  ],
  longitudinalLabObservations: [
    "Hb Trajectory (Jan-Jul): 13.4 -> 12.6 -> 11.7 -> 10.8 g/dL",
    "Observation: Continuous downward trend over 6 months correlation with current energy complaint."
  ],
  triageUrgency: "Routine evaluation",
  recommendedActions: [
    "Schedule primary care visit within 48-72 hours",
    "Complete Iron / Ferritin panel and CBC recheck",
    "Monitor daily vitals via Guardian AI passive tracking"
  ]
};
