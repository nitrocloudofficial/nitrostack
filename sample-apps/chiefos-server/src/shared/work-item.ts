/**
 * WorkItem Domain Model
 * 
 * Represents a unit of work (email, meeting, calendar event, or task)
 * that flows through the ChiefOS triage and approval pipeline.
 */

import { z } from '@nitrostack/core';
import { WorkItemType, Priority, WorkStatus } from './enums.js';

/**
 * WorkItem Interface
 * 
 * Core data structure for all incoming work items in the system.
 */
export interface WorkItem {
  /** Unique identifier for the work item */
  id: string;

  /** Type of work item (EMAIL, MEETING, CALENDAR, TASK) */
  type: WorkItemType;

  /** Brief title or subject of the work item */
  title: string;

  /** Detailed description or body content */
  description: string;

  /** Priority level (LOW, MEDIUM, HIGH, CRITICAL) */
  priority: Priority;

  /** Source system or origin (e.g., 'gmail', 'outlook', 'slack') */
  source: string;

  /** Timestamp when the work item was received */
  receivedAt: Date;

  /** Current lifecycle status (RECEIVED, TRIAGED, WAITING_APPROVAL, COMPLETED) */
  status: WorkStatus;
}

/**
 * Zod Schema for WorkItem Validation
 * 
 * Ensures runtime type safety and coerces string dates to Date objects.
 */
export const workItemSchema = z.object({
  id: z.string().min(1, 'Work item ID is required'),
  type: z.nativeEnum(WorkItemType),
  title: z.string().min(1, 'Title is required').max(500, 'Title must be 500 characters or less'),
  description: z.string().min(1, 'Description is required').max(5000, 'Description must be 5000 characters or less'),
  priority: z.nativeEnum(Priority),
  source: z.string().min(1, 'Source is required'),
  receivedAt: z.coerce.date(),
  status: z.nativeEnum(WorkStatus),
});

/**
 * Type inference from Zod schema
 */
export type WorkItemSchema = z.infer<typeof workItemSchema>;
