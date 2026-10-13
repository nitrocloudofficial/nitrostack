/**
 * Recommendation Domain Model
 * 
 * Represents an AI agent's recommendation for how to handle a work item,
 * including confidence level and approval requirements.
 */

import { z } from '@nitrostack/core';

/**
 * Recommendation Interface
 * 
 * Captures the decision made by an AI agent for a given work item.
 */
export interface Recommendation {
  /** Unique identifier for the recommendation request */
  requestId: string;

  /** Name or identifier of the AI agent that made the recommendation */
  selectedAgent: string;

  /** The recommended action or decision */
  decision: string;

  /** Explanation of why this decision was recommended */
  reason: string;

  /** Confidence level of the recommendation (0.0 to 1.0) */
  confidence: number;

  /** Whether this recommendation requires human approval */
  requiresApproval: boolean;

  /** Timestamp when the recommendation was generated */
  timestamp: Date;
}

/**
 * Zod Schema for Recommendation Validation
 * 
 * Ensures runtime type safety, validates confidence bounds, and coerces dates.
 */
export const recommendationSchema = z.object({
  requestId: z.string().min(1, 'Request ID is required'),
  selectedAgent: z.string().min(1, 'Selected agent is required'),
  decision: z.string().min(1, 'Decision is required').max(1000, 'Decision must be 1000 characters or less'),
  reason: z.string().min(1, 'Reason is required').max(2000, 'Reason must be 2000 characters or less'),
  confidence: z.number().min(0, 'Confidence must be at least 0').max(1, 'Confidence must be at most 1'),
  requiresApproval: z.boolean(),
  timestamp: z.coerce.date(),
});

/**
 * Type inference from Zod schema
 */
export type RecommendationSchema = z.infer<typeof recommendationSchema>;
