/**
 * Approval Domain Model
 * 
 * Represents a human approval decision on a work item recommendation,
 * tracking who approved/rejected and when.
 */

import { z } from '@nitrostack/core';
import { ApprovalStatus } from './enums.js';

/**
 * Approval Interface
 * 
 * Captures the human approval workflow state for a recommendation.
 */
export interface Approval {
  /** Unique identifier for the approval record */
  approvalId: string;

  /** Reference to the work item or recommendation being approved */
  requestId: string;

  /** User ID or email of the person who approved/rejected */
  approvedBy: string;

  /** The approval decision (e.g., 'APPROVED', 'REJECTED', or custom action) */
  decision: string;

  /** Current approval status (PENDING, APPROVED, REJECTED) */
  status: ApprovalStatus;

  /** Timestamp when the approval decision was made */
  approvedAt: Date;
}

/**
 * Zod Schema for Approval Validation
 * 
 * Ensures runtime type safety and coerces dates.
 */
export const approvalSchema = z.object({
  approvalId: z.string().min(1, 'Approval ID is required'),
  requestId: z.string().min(1, 'Request ID is required'),
  approvedBy: z.string().min(1, 'Approver identifier is required'),
  decision: z.string().min(1, 'Decision is required').max(500, 'Decision must be 500 characters or less'),
  status: z.nativeEnum(ApprovalStatus),
  approvedAt: z.coerce.date(),
});

/**
 * Type inference from Zod schema
 */
export type ApprovalSchema = z.infer<typeof approvalSchema>;
