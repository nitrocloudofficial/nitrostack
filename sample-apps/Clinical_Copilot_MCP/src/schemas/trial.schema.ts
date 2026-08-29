import { z } from '@nitrostack/core';

/**
 * Clinical Copilot MCP Server - Trial Schemas
 *
 * Defines Zod schemas for clinical trial searches, inclusion/exclusion criteria,
 * and patient-to-trial eligibility scoring outputs.
 */

// TODO: Align clinical trial fields with ClinicalTrials.gov API response schema

export const TrialSearchInputSchema = z.object({
  condition: z.string().describe('Primary disease or medical condition (e.g. Non-Small Cell Lung Cancer)'),
  location: z.string().optional().describe('Geographic location, state, or postal code'),
  phase: z.enum(['PHASE1', 'PHASE2', 'PHASE3', 'PHASE4', 'ANY']).default('ANY').describe('Trial clinical phase'),
  recruitmentStatus: z.enum(['RECRUITING', 'NOT_YET_RECRUITING', 'COMPLETED', 'ALL']).default('RECRUITING').describe('Recruitment status'),
  limit: z.number().default(10).describe('Maximum number of matching trials to return'),
});

export const TrialMatchingResultSchema = z.object({
  nctId: z.string().describe('ClinicalTrials.gov National Clinical Trial ID (e.g. NCT01234567)'),
  title: z.string().describe('Official title of the clinical trial study'),
  phase: z.string().describe('Trial development phase'),
  sponsor: z.string().describe('Sponsoring institution or pharmaceutical company'),
  overallStatus: z.string().describe('Current recruitment status'),
  eligibilityScore: z.number().describe('Calculated eligibility score (0 to 100%)'),
  matchedCriteria: z.array(z.string()).describe('Patient attributes matching inclusion criteria'),
  unmatchedCriteria: z.array(z.string()).describe('Patient attributes failing or ambiguous against criteria'),
  contactEmail: z.string().optional().describe('Study coordinator contact email'),
});

export type TrialSearchInput = z.infer<typeof TrialSearchInputSchema>;
export type TrialMatchingResult = z.infer<typeof TrialMatchingResultSchema>;
