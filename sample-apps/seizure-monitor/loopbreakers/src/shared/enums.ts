/**
 * Enums for NexusOS Shared Domain Models
 */

/**
 * Severity level of an enterprise incident.
 */
export enum IncidentSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Lifecycle status of an enterprise incident.
 */
export enum IncidentStatus {
  OPEN = 'OPEN',
  INVESTIGATING = 'INVESTIGATING',
  MITIGATED = 'MITIGATED',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

/**
 * Priority level of an agent recommendation or proposal.
 */
export enum ProposalPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

/**
 * Category or classification type of an enterprise incident.
 */
export enum IncidentType {
  SECURITY_BREACH = 'SECURITY_BREACH',
  SYSTEM_OUTAGE = 'SYSTEM_OUTAGE',
  DATA_LEAK = 'DATA_LEAK',
  MALWARE = 'MALWARE',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  COMPLIANCE_VIOLATION = 'COMPLIANCE_VIOLATION',
  OTHER = 'OTHER',
}

/**
 * Processing or delivery status of a notification.
 */
export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
}
