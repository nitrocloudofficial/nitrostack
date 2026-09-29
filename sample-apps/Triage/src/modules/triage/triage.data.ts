// src/modules/triage/triage.data.ts

export const CRITICAL_KEYWORDS = [
  'chest pain', 'can\'t breathe', 'cannot breathe', 'severe bleeding',
  'unconscious', 'unresponsive', 'stroke', 'seizure', 'anaphylaxis',
  'suicidal', 'heart attack', 'not breathing', 'choking'
];

export const MODERATE_KEYWORDS = [
  'high fever', 'severe pain', 'vomiting blood', 'broken bone',
  'deep cut', 'allergic reaction', 'dizziness', 'confusion'
];

export const VITALS_THRESHOLDS = {
  heartRate: { criticalLow: 40, criticalHigh: 150 },
  spo2: { criticalLow: 90 },              // blood oxygen %
  systolicBP: { criticalLow: 80, criticalHigh: 180 },
  temperatureC: { criticalHigh: 40 }
};

export type SeverityLevel = 'low' | 'moderate' | 'critical';