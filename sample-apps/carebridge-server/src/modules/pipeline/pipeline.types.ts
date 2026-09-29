/**
 * Pipeline Module - Type Definitions
 * Milestone 3: Intelligence Pipeline
 */

import { GuardianDeviationAnalysis } from '../guardian/guardian.types.js';

export interface PipelineInput {
  userMessage: string;
  patientId?: string;
  additionalSymptoms?: string[];
}

export interface PipelineResult {
  pipelineVersion: string;
  userMessage: string;
  guardianAnalysis: GuardianDeviationAnalysis;
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
  triageFollowUpQuestions: {
    id: string;
    questionText: string;
    options: string[];
  }[];
  redFlagAssessment: {
    isRedFlagTriggered: boolean;
    matchedRedFlags: string[];
    urgency: string;
    recommendedAction: string;
  };
  finalUrgencyClassification: 'Emergency' | 'Urgent' | 'Routine evaluation' | 'Monitor/self-care';
  escalationFactors: string[];
  safetyDisclaimer: string;
}
