/**
 * Shared Domain Enums
 * 
 * Core enumeration types used across the ChiefOS system for
 * consistent classification and state management.
 */

/**
 * WorkItemType - Classification of incoming work items
 */
export enum WorkItemType {
  EMAIL = 'EMAIL',
  MEETING = 'MEETING',
  CALENDAR = 'CALENDAR',
  TASK = 'TASK',
}

/**
 * Priority - Urgency level of work items
 */
export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * ApprovalStatus - State of approval workflows
 */
export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/**
 * WorkStatus - Lifecycle state of work items
 */
export enum WorkStatus {
  RECEIVED = 'RECEIVED',
  TRIAGED = 'TRIAGED',
  WAITING_APPROVAL = 'WAITING_APPROVAL',
  COMPLETED = 'COMPLETED',
}
