import { z } from '@nitrostack/core';

/**
 * Clinical Copilot MCP Server - Referral Schema
 *
 * Defines Zod schema and TypeScript interfaces for specialist referral documents in the MongoDB 'referrals' collection.
 */

export const ReferralSchema = z.object({
  referralId: z.string().describe('Unique identifier for the specialist referral'),
  patientId: z.string().describe('Target patient ID'),
  trialId: z.string().describe('Associated clinical trial ID (NCT ID)'),
  pdfUrl: z.string().describe('Storage URL of generated referral PDF document'),
  createdAt: z.string().optional().describe('ISO timestamp of referral document creation'),
  generatedAt: z.string().optional().describe('ISO timestamp of referral document generation'),
  llmUsed: z.string().optional().describe('LLM engine provider used (Gemini / Grok / Template)'),
});

export type ReferralDocument = z.infer<typeof ReferralSchema>;
