import { z } from 'zod';

export type EvidenceClassification = 'CONFIRMED_IMPACT' | 'LIKELY_IMPACT' | 'FALSE_POSITIVE' | 'REVIEW_REQUIRED';
export type EvidenceConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ModelMigrationAction {
  title: string;
  description: string;
  repository: string;
  filePath: string;
  lineNumber?: number;
  relatedChangeIds: string[];
}

export interface ModelEvidenceAssessment {
  evidenceId: string;
  classification: EvidenceClassification;
  confidence: EvidenceConfidence;
  matchedChangeIds: string[];
  reasoning: string;
  migrationActions: ModelMigrationAction[];
}

export interface AssessRiskOutput {
  assessments: ModelEvidenceAssessment[];
  limitations: string[];
}

export const EvidenceAssessmentSchema = z.object({
  evidenceId: z.string().min(1),
  classification: z.enum(['CONFIRMED_IMPACT', 'LIKELY_IMPACT', 'FALSE_POSITIVE', 'REVIEW_REQUIRED']),
  confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  matchedChangeIds: z.array(z.string()),
  reasoning: z.string().min(5).max(500),
  migrationActions: z.array(z.object({
    title: z.string().min(3).max(120), description: z.string().min(5).max(500), repository: z.string(), filePath: z.string(),
    lineNumber: z.number().int().positive().optional(), relatedChangeIds: z.array(z.string()).min(1)
  })).max(3)
});

export const AssessRiskOutputSchema = z.object({
  assessments: z.array(EvidenceAssessmentSchema),
  limitations: z.array(z.string().max(240)).max(8)
}) as { parse(input: unknown): AssessRiskOutput };
