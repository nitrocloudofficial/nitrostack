/**
 * Orchestrator Service — Chief Orchestration Engine
 * 
 * Central intelligence layer that:
 * 1. Validates work items against shared Zod schema
 * 2. Auto-classifies if type is missing
 * 3. Routes to the correct specialist agent
 * 4. Generates recommendations with approval requirements
 * 5. Creates audit records
 * 
 * All orchestrations require human approval before execution.
 */

import { Injectable, ExecutionContext } from '@nitrostack/core';
import {
  WorkItem,
  workItemSchema,
  Recommendation,
  AuditEntry,
  WorkItemType,
} from '../../shared/index.js';
import { ClassifierService, ClassificationResult } from './classifier.service.js';
import { AuditService } from './audit.service.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Orchestration Result
 * 
 * Returned by orchestrate() with recommendation and audit trail.
 */
export interface OrchestrationResult {
  recommendation: Recommendation;
  audit: AuditEntry[];
}

/**
 * Agent Routing Map
 * 
 * Maps WorkItemType to specialist agent names.
 */
const AGENT_ROUTING: Record<WorkItemType, string> = {
  [WorkItemType.EMAIL]: 'InboxAgent',
  [WorkItemType.MEETING]: 'MeetingScheduler',
  [WorkItemType.CALENDAR]: 'CalendarAgent',
  [WorkItemType.TASK]: 'TaskManager',
};

/**
 * Orchestrator Service
 * 
 * Orchestrates work item processing through the ChiefOS system.
 */
@Injectable({ deps: [ClassifierService, AuditService] })
export class OrchestratorService {
  constructor(
    private classifierService: ClassifierService,
    private auditService: AuditService,
  ) {}

  /**
   * Orchestrate a work item through the ChiefOS system.
   * 
   * Workflow:
   * 1. Validate work item against Zod schema
   * 2. Auto-classify if type is missing
   * 3. Route to specialist agent
   * 4. Generate recommendation with approval requirement
   * 5. Create audit trail
   * 
   * @param workItem - Work item to orchestrate
   * @param ctx - Execution context for logging
   * @returns OrchestrationResult with recommendation and audit trail
   */
  orchestrate(workItem: WorkItem, ctx?: ExecutionContext): OrchestrationResult {
    const auditTrail: AuditEntry[] = [];
    const requestId = workItem.id || uuidv4();

    // Log: Incoming request
    if (ctx) {
      ctx.logger.info(`[ORCHESTRATOR] Incoming request: ${requestId}`, {
        title: workItem.title,
        type: workItem.type,
      } as any);
    }

    // Step 1: Validate work item
    let validatedWorkItem: WorkItem;
    try {
      validatedWorkItem = workItemSchema.parse(workItem);
      if (ctx) {
        ctx.logger.info(`[ORCHESTRATOR] Validation passed: ${requestId}`);
      }
    } catch (error) {
      if (ctx) {
        ctx.logger.error(`[ORCHESTRATOR] Validation failed: ${requestId}`, { error } as any);
      }
      throw new Error(`Invalid work item: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Step 2: Auto-classify if type is missing
    let classifiedType = validatedWorkItem.type;
    let classificationResult: ClassificationResult | null = null;

    if (!classifiedType) {
      if (ctx) {
        ctx.logger.info(`[ORCHESTRATOR] Type missing, auto-classifying: ${requestId}`);
      }

      classificationResult = this.classifierService.classifyWorkItem(
        validatedWorkItem.title,
        validatedWorkItem.description,
      );
      classifiedType = classificationResult.type;

      if (ctx) {
        ctx.logger.info(`[ORCHESTRATOR] Classification result: ${classifiedType}`, {
          confidence: classificationResult.confidence,
          keywords: classificationResult.keywordsMatched,
        } as any);
      }

      // Create classification audit
      const classificationAudit = this.auditService.createClassificationAudit(
        requestId,
        classifiedType,
        classificationResult.confidence,
        classificationResult.keywordsMatched,
      );
      auditTrail.push(classificationAudit);
    }

    // Step 3: Route to specialist agent
    const selectedAgent = AGENT_ROUTING[classifiedType];
    if (!selectedAgent) {
      if (ctx) {
        ctx.logger.error(`[ORCHESTRATOR] No agent found for type: ${classifiedType}`);
      }
      throw new Error(`No agent found for work item type: ${classifiedType}`);
    }

    if (ctx) {
      ctx.logger.info(`[ORCHESTRATOR] Routing to agent: ${selectedAgent}`, {
        type: classifiedType,
      } as any);
    }

    // Create routing audit
    const routingAudit = this.auditService.createRoutingAudit(
      requestId,
      selectedAgent,
      classifiedType,
    );
    auditTrail.push(routingAudit);

    // Step 4: Generate recommendation
    const decision = this.generateDecision(classifiedType, validatedWorkItem);

    const recommendation: Recommendation = {
      requestId,
      selectedAgent,
      decision,
      reason: `${selectedAgent} will handle ${classifiedType} work item: "${validatedWorkItem.title}"`,
      confidence: classificationResult?.confidence ?? 0.95, // High confidence if already typed
      requiresApproval: true, // ALWAYS require approval
      timestamp: new Date(),
    };

    if (ctx) {
      ctx.logger.info(`[ORCHESTRATOR] Recommendation generated: ${requestId}`, {
        agent: selectedAgent,
        confidence: recommendation.confidence,
        requiresApproval: recommendation.requiresApproval,
      } as any);
    }

    // Create approval request audit
    const approvalAudit = this.auditService.createApprovalRequestAudit(
      requestId,
      selectedAgent,
      decision,
    );
    auditTrail.push(approvalAudit);

    if (ctx) {
      ctx.logger.info(`[ORCHESTRATOR] Orchestration complete: ${requestId}`, {
        agent: selectedAgent,
        auditRecords: auditTrail.length,
      } as any);
    }

    return {
      recommendation,
      audit: auditTrail,
    };
  }

  /**
   * Generate a decision string based on work item type.
   * 
   * @param type - Work item type
   * @param workItem - Work item details
   * @returns Decision string
   */
  private generateDecision(type: WorkItemType, workItem: WorkItem): string {
    switch (type) {
      case WorkItemType.EMAIL:
        return `Analyze priority and draft response for: "${workItem.title}"`;
      case WorkItemType.MEETING:
        return `Schedule meeting and send invites for: "${workItem.title}"`;
      case WorkItemType.CALENDAR:
        return `Block calendar time for: "${workItem.title}"`;
      case WorkItemType.TASK:
        return `Create and track task: "${workItem.title}"`;
      default:
        return `Process work item: "${workItem.title}"`;
    }
  }
}
