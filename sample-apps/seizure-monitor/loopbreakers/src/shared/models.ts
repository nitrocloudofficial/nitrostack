/**
 * Shared Domain Models for NexusOS Enterprise Incident Response Platform
 */

import {
  IncidentSeverity,
  IncidentStatus,
  ProposalPriority,
  IncidentType,
  NotificationStatus,
} from './enums.js';

/**
 * Base entity with standard tracking fields.
 */
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Represents an enterprise incident.
 */
export interface Incident {
  /** Unique identifier for the incident */
  id: string;
  /** Title of the incident */
  title: string;
  /** Detailed description of the incident */
  description: string;
  /** Categorization of the incident */
  incidentType: IncidentType;
  /** Severity level of the incident */
  severity: IncidentSeverity;
  /** Source or detector reporting the incident */
  source: string;
  /** Current status of the incident */
  status: IncidentStatus;
  /** Timestamp when the incident occurred or was recorded */
  timestamp: Date;
}

/**
 * Represents a recommendation returned by an agent or MCP.
 */
export interface Proposal {
  /** Name of the originating agent or MCP */
  agentName: string;
  /** Priority level of the proposed recommendation */
  priority: ProposalPriority;
  /** Recommended strategy or resolution details */
  recommendation: string;
  /** Explanation and logic supporting the recommendation */
  reasoning: string;
  /** Action items suggested for execution */
  actions: string[];
  /** Timestamp when the proposal was generated */
  timestamp: Date;
}

/**
 * Represents the final decision produced by the Arbitration MCP.
 */
export interface Decision {
  /** Identifier of the incident associated with this decision */
  incidentId: string;
  /** List of actions approved for execution */
  approvedActions: string[];
  /** Justification and context for the decision */
  decisionReason: string;
  /** User, service, or system entity that approved the decision */
  approvedBy: string;
  /** Timestamp when the decision was rendered */
  timestamp: Date;
}

/**
 * Represents an audit record documenting platform events.
 */
export interface AuditLog {
  /** Unique identifier for the audit record */
  id: string;
  /** Identifier of the related incident */
  incidentId: string;
  /** Name or description of the event logged */
  event: string;
  /** User or system actor who performed the action */
  performedBy: string;
  /** Timestamp when the action was recorded */
  timestamp: Date;
}

/**
 * Represents an email or alert notification.
 */
export interface Notification {
  /** Recipient address, user identifier, or target channel */
  recipient: string;
  /** Subject line of the notification */
  subject: string;
  /** Content message of the notification */
  message: string;
  /** Delivery status of the notification */
  status: NotificationStatus;
  /** Timestamp when the notification was created or sent */
  timestamp: Date;
}
