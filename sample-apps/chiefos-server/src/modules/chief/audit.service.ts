/**
 * Audit Service — Audit Integration Layer
 * 
 * Creates immutable audit records for every orchestration event.
 * Tracks classification results, routing decisions, and recommendations.
 */

import { Injectable } from '@nitrostack/core';
import { AuditEntry } from '../../shared/index.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Audit Service
 * 
 * Generates audit records for compliance and debugging.
 */
@Injectable()
export class AuditService {
  /**
   * Create an audit record for a work item orchestration.
   * 
   * @param requestId - Unique identifier for the work item request
   * @param agent - Name of the agent/system that handled the request
   * @param action - Action taken (e.g., 'CLASSIFICATION_COMPLETED', 'ROUTING_COMPLETED')
   * @param reason - Explanation or context for the action
   * @returns AuditEntry with immutable record
   */
  createAuditRecord(
    requestId: string,
    agent: string,
    action: string,
    reason: string,
  ): AuditEntry {
    return {
      auditId: uuidv4(),
      requestId,
      agent,
      action,
      reason,
      timestamp: new Date(),
    };
  }

  /**
   * Create a classification audit record.
   * 
   * @param requestId - Work item request ID
   * @param classifiedType - The type the item was classified as
   * @param confidence - Classification confidence (0–1)
   * @param keywordsMatched - Keywords that matched during classification
   * @returns AuditEntry
   */
  createClassificationAudit(
    requestId: string,
    classifiedType: string,
    confidence: number,
    keywordsMatched: string[],
  ): AuditEntry {
    return this.createAuditRecord(
      requestId,
      'ClassifierService',
      'CLASSIFICATION_COMPLETED',
      `Classified as ${classifiedType} with confidence ${(confidence * 100).toFixed(1)}%. Keywords: ${keywordsMatched.join(', ') || 'none'}`,
    );
  }

  /**
   * Create a routing audit record.
   * 
   * @param requestId - Work item request ID
   * @param selectedAgent - Agent selected for handling
   * @param workItemType - Type of work item
   * @returns AuditEntry
   */
  createRoutingAudit(
    requestId: string,
    selectedAgent: string,
    workItemType: string,
  ): AuditEntry {
    return this.createAuditRecord(
      requestId,
      'OrchestratorService',
      'ROUTING_COMPLETED',
      `Routed ${workItemType} to ${selectedAgent}`,
    );
  }

  /**
   * Create an approval request audit record.
   * 
   * @param requestId - Work item request ID
   * @param selectedAgent - Agent that will handle the work
   * @param decision - Recommendation decision
   * @returns AuditEntry
   */
  createApprovalRequestAudit(
    requestId: string,
    selectedAgent: string,
    decision: string,
  ): AuditEntry {
    return this.createAuditRecord(
      requestId,
      'OrchestratorService',
      'APPROVAL_REQUESTED',
      `Approval requested for ${selectedAgent} to ${decision}`,
    );
  }
}
