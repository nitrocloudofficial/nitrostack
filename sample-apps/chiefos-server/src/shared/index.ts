/**
 * Shared Domain Layer - Central Export
 * 
 * Re-exports all domain models, enums, and Zod schemas for use across
 * the ChiefOS system. Single import point for domain types and validation.
 * 
 * Usage:
 *   import { WorkItem, Priority, workItemSchema } from '@/shared';
 *   import { Recommendation, recommendationSchema } from '@/shared';
 *   import { Approval, ApprovalStatus, approvalSchema } from '@/shared';
 *   import { AuditEntry, auditEntrySchema } from '@/shared';
 */

// Enums
export { WorkItemType, Priority, ApprovalStatus, WorkStatus } from './enums.js';

// WorkItem
export type { WorkItem } from './work-item.js';
export { workItemSchema, type WorkItemSchema } from './work-item.js';

// Recommendation
export type { Recommendation } from './recommendation.js';
export { recommendationSchema, type RecommendationSchema } from './recommendation.js';

// Approval
export type { Approval } from './approval.js';
export { approvalSchema, type ApprovalSchema } from './approval.js';

// Audit
export type { AuditEntry } from './audit.js';
export { auditEntrySchema, type AuditEntrySchema } from './audit.js';
