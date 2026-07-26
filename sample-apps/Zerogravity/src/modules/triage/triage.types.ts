/**
 * Triage Module Type Definitions
 */

import { RedFlag } from './triage-rules.js';

/**
 * Input for analyze-symptoms tool
 */
export interface AnalyzeSymptomsInput {
  patientId: string;
  recordId?: string;
  symptomDescription: string;
}

/**
 * Candidate condition from symptom analysis
 */
export interface CandidateCondition {
  name: string;
  specialty: string;
  confidence: number; // 0-1 scale
  reasoning: string;
}

/**
 * Output from analyze-symptoms tool
 */
export interface SymptomAnalysisResult {
  patientId: string;
  recordId?: string;
  symptomDescription: string;
  detectedRedFlags: RedFlag[];
  candidateConditions: CandidateCondition[];
  confidenceScore: number; // 0-1 scale, based on red flags
  timestamp: string;
}

/**
 * Input for score-urgency tool
 */
export interface ScoreUrgencyInput {
  recordId?: string;
  analysis: SymptomAnalysisResult;
}

/**
 * Output from score-urgency tool
 */
export interface UrgencyResult {
  recordId?: string;
  urgencyLevel: 'low' | 'medium' | 'high' | 'emergency';
  severityScore: number; // 0-1 scale
  rationale: string;
  emergencyCareAdvised: boolean;
  recommendedActions: string[];
  detectedRedFlags: Array<{
    id: string;
    description: string;
    severity: number;
    category: string;
  }>;
}
