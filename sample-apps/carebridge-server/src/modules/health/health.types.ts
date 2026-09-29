/**
 * Health Intelligence Module - Type Definitions
 * Milestone 1 & 2 Foundation
 */

export interface HistoricalLabAnalysis {
  testName: string;
  trendDirection: 'stable' | 'declining' | 'improving' | 'fluctuating';
  readings: { date: string; value: number; unit: string }[];
  observationSummary: string;
  clinicalRelevance: string;
}

export interface ClinicianHandoffBrief {
  briefId: string;
  patientName: string;
  age: number;
  gender: string;
  dateGenerated: string;
  symptomSummary: string;
  baselineDeviations: string[];
  longitudinalFindings: string[];
  triageClassification: string;
  suggestedClinicalFollowup: string[];
}
