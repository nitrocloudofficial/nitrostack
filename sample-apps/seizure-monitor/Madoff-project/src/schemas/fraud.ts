import { z } from 'zod';

export const FraudDecisionSchema = z.object({
  fraud_probability: z.number().min(0).max(1).describe("Probability between 0 and 1 that the claim is fraudulent"),
  confidence: z.number().min(0).max(1).describe("Confidence score of the AI's analysis between 0 and 1"),
  reasoning: z.array(z.string()).describe("List of reasons justifying the fraud probability"),
  red_flags: z.array(z.string()).describe("Specific red flags identified in the document or claim"),
  missing_information: z.array(z.string()).describe("Missing information that would help in the investigation"),
  recommendation: z.string().describe("Recommendation: 'APPROVE', 'REJECT', 'ESCALATE', or 'MANUAL_REVIEW'"),
  summary: z.string().describe("A brief summary of the findings")
});

export type FraudDecision = z.infer<typeof FraudDecisionSchema>;
