/**
 * Audit domain types for the IT Access Resolver compliance engine.
 */

export type AuditEventType =
  | 'ticket.created'
  | 'ticket.resolved'
  | 'ticket.escalated'
  | 'ticket.diagnosed'
  | 'access.action';

export interface AuditRecord {
  /** Unique audit record identifier, e.g. AUD-001 */
  auditId: string;
  /** The domain event that triggered this record */
  eventType: AuditEventType;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Ticket this audit record relates to (optional for direct access interventions) */
  ticketId?: string;
  /** Employee affected */
  employeeId?: string;
  /** Human-readable description of the automated action taken */
  actionDescription: string;
  /** Root cause if applicable */
  rootCause?: string;
  /** Whether the action was automated (true) or required human escalation (false) */
  automated: boolean;
  /** Simulated employee-facing notification message */
  simulatedNotification?: string;
}
