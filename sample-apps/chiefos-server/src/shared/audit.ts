/**
 * Audit Domain Model
 * 
 * Represents an immutable audit log entry tracking all actions taken
 * on work items throughout their lifecycle in the ChiefOS system.
 */

import { z } from '@nitrostack/core';

/**
 * AuditEntry Interface
 * 
 * Immutable record of an action taken on a work item for compliance and debugging.
 */
export interface AuditEntry {
  /** Unique identifier for the audit entry */
  auditId: string;

  /** Reference to the work item or request being audited */
  requestId: string;

  /** Name or identifier of the agent/system that performed the action */
  agent: string;

  /** Description of the action taken (e.g., 'TRIAGE_COMPLETED', 'APPROVAL_REQUESTED') */
  action: string;

  /** Explanation or context for why this action was taken */
  reason: string;

  /** Timestamp when the action occurred */
  timestamp: Date;
}

/**
 * Zod Schema for AuditEntry Validation
 * 
 * Ensures runtime type safety and coerces dates.
 */
export const auditEntrySchema = z.object({
  auditId: z.string().min(1, 'Audit ID is required'),
  requestId: z.string().min(1, 'Request ID is required'),
  agent: z.string().min(1, 'Agent identifier is required'),
  action: z.string().min(1, 'Action is required').max(100, 'Action must be 100 characters or less'),
  reason: z.string().min(1, 'Reason is required').max(1000, 'Reason must be 1000 characters or less'),
  timestamp: z.coerce.date(),
});

/**
 * Type inference from Zod schema
 */
export type AuditEntrySchema = z.infer<typeof auditEntrySchema>;
