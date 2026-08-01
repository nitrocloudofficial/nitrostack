export type SeverityLevel = 'Critical' | 'Severe' | 'Moderate' | 'Mild';

export interface SymptomTriageInput {
  symptoms: string;
  patient_age?: number;
  patient_gender?: string;
}

export interface SymptomTriageResult {
  severity: SeverityLevel;
  requiredDepartment: string;
  confidence: number;
  reasoning?: string;
}

/**
 * Internal, richer triage record produced by TriageService before it is
 * shaped into the public SymptomTriageResult tool output.
 */
export interface EmergencyAssessment extends SymptomTriageResult {
  matched_keywords: string[];
  assessed_at: string;
}
